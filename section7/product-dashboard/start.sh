#!/bin/bash
set -e

# === СЕТИ ===
echo "=== Creating networks ==="
docker network create --gateway 172.20.0.1 --subnet 172.20.0.0/24 proxy-net 2>/dev/null || echo "proxy-net exists"
docker network create --gateway 172.21.0.1 --subnet 172.21.0.0/24 app-net 2>/dev/null || echo "app-net exists"
docker network create --gateway 172.22.0.1 --subnet 172.22.0.0/24 db-net 2>/dev/null || echo "db-net exists"

# === VOLUMES ===
echo "=== Creating volumes ==="
docker volume create pgdata 2>/dev/null || true
docker volume create backend-data 2>/dev/null || true

# === POSTGRESQL (db-net only) ===
echo "=== Starting PostgreSQL ==="
docker rm -f postgres 2>/dev/null || true
docker run -d \
    --name postgres \
    --network db-net \
    --ip 172.22.0.10 \
    --mac-address 02:42:ac:16:00:0a \
    -e POSTGRES_DB=productsdb \
    -e POSTGRES_USER=products \
    -e POSTGRES_PASSWORD=products \
    --mount source=pgdata,target=/var/lib/postgresql/data \
    postgres:16-alpine

# === REDIS (app-net only) ===
echo "=== Starting Redis ==="
docker rm -f redis 2>/dev/null || true
docker run -d \
    --name redis \
    --network app-net \
    --ip 172.21.0.10 \
    -e REDIS_ARGS="--save '' --appendonly no" \
    --tmpfs /data:rw,noexec,nosuid,size=64m \
    redis:7-alpine

# === BACKEND 1 (proxy-net + app-net + db-net) ===
echo "=== Starting Backend 1 ==="
docker rm -f backend_1 2>/dev/null || true
docker run -d \
    --name backend_1 \
    --network proxy-net \
    --ip 172.20.0.11 \
    -e PORT=3000 \
    -e POSTGRES_HOST=172.22.0.10 \
    -e POSTGRES_PORT=5432 \
    -e POSTGRES_DB=productsdb \
    -e POSTGRES_USER=products \
    -e POSTGRES_PASSWORD=products \
    -e REDIS_URL=redis://172.21.0.10:6379 \
    -e INSTANCE_ID=backend-1 \
    --mount source=backend-data,target=/app/data \
    --tmpfs /tmp:rw,noexec,nosuid,size=64m \
    product-backend

docker network connect --ip 172.21.0.11 app-net backend_1
docker network connect --ip 172.22.0.11 db-net backend_1

# === BACKEND 2 (proxy-net + app-net + db-net) ===
echo "=== Starting Backend 2 ==="
docker rm -f backend_2 2>/dev/null || true
docker run -d \
    --name backend_2 \
    --network proxy-net \
    --ip 172.20.0.12 \
    -e PORT=3001 \
    -e POSTGRES_HOST=172.22.0.10 \
    -e POSTGRES_PORT=5432 \
    -e POSTGRES_DB=productsdb \
    -e POSTGRES_USER=products \
    -e POSTGRES_PASSWORD=products \
    -e REDIS_URL=redis://172.21.0.10:6379 \
    -e INSTANCE_ID=backend-2 \
    --mount source=backend-data,target=/app/data \
    --tmpfs /tmp:rw,noexec,nosuid,size=64m \
    product-backend

docker network connect --ip 172.21.0.12 app-net backend_2
docker network connect --ip 172.22.0.12 db-net backend_2

# === WORKER (app-net only, NO proxy-net) ===
echo "=== Starting Worker ==="
docker rm -f worker 2>/dev/null || true
docker run -d \
    --name worker \
    --network app-net \
    --ip 172.21.0.20 \
    -e POSTGRES_HOST=172.22.0.10 \
    -e POSTGRES_PORT=5432 \
    -e POSTGRES_DB=productsdb \
    -e POSTGRES_USER=products \
    -e POSTGRES_PASSWORD=products \
    -e REDIS_URL=redis://172.21.0.10:6379 \
    -e INSTANCE_ID=worker \
    --tmpfs /tmp:rw,noexec,nosuid,size=64m \
    product-backend \
    node src/server.js  # или другая команда для worker

# === NGINX (proxy-net only) ===
echo "=== Starting Nginx ==="
docker rm -f nginx 2>/dev/null || true
docker run -d \
    --name nginx \
    --network proxy-net \
    --ip 172.20.0.10 \
    -p 80:80 \
    --mount type=bind,src=$(pwd)/nginx/default.conf,target=/etc/nginx/conf.d/default.conf,readonly \
    --tmpfs /tmp:rw,noexec,nosuid,size=64m,uid=101 \
    --tmpfs /var/cache/nginx:rw,noexec,nosuid,size=64m,uid=101 \
    --tmpfs /var/run:rw,noexec,nosuid,size=16m,uid=101 \
    product-frontend

echo ""
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Networks:"
docker network inspect proxy-net --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{println}}{{end}}'
docker network inspect app-net --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{println}}{{end}}'
docker network inspect db-net --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{println}}{{end}}'
