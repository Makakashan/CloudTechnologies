#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

NETWORK_NAME="product-net"
POSTGRES_VOLUME="pgdata"
BACKEND_VOLUME="backend-data"

# Build images
docker build -t product-backend "${SCRIPT_DIR}/backend"
docker build -t product-frontend -f "${SCRIPT_DIR}/frontend/Dockerfile" "${SCRIPT_DIR}"

# Create network
docker network create ${NETWORK_NAME} 2>/dev/null || echo "Network ${NETWORK_NAME} already exists"

# Create volumes
docker volume create ${POSTGRES_VOLUME} 2>/dev/null || echo "Volume ${POSTGRES_VOLUME} already exists"
docker volume create ${BACKEND_VOLUME} 2>/dev/null || echo "Volume ${BACKEND_VOLUME} already exists"

# Start PostgreSQL
docker rm -f postgres 2>/dev/null || true
docker run -d \
    --name postgres \
    --network ${NETWORK_NAME} \
    -e POSTGRES_DB=productsdb \
    -e POSTGRES_USER=products \
    -e POSTGRES_PASSWORD=products \
    --mount source=${POSTGRES_VOLUME},target=/var/lib/postgresql/data \
    postgres:16-alpine

# Start Redis
docker rm -f redis 2>/dev/null || true
docker run -d \
    --name redis \
    --network ${NETWORK_NAME} \
    --tmpfs /data:rw,noexec,nosuid,size=64m \
    redis:7-alpine \
    redis-server --save "" --appendonly no

# Wait for PostgreSQL
sleep 3

# Start Backend API
docker rm -f api 2>/dev/null || true
docker run -d \
    --name api \
    --network ${NETWORK_NAME} \
    -e PORT=3000 \
    -e POSTGRES_HOST=postgres \
    -e POSTGRES_PORT=5432 \
    -e POSTGRES_DB=productsdb \
    -e POSTGRES_USER=products \
    -e POSTGRES_PASSWORD=products \
    -e REDIS_URL=redis://redis:6379 \
    --mount source=${BACKEND_VOLUME},target=/app/data \
    --tmpfs /tmp:rw,noexec,nosuid,size=64m \
    product-backend

# Start Nginx
docker rm -f nginx 2>/dev/null || true
docker run -d \
    --name nginx \
    --network ${NETWORK_NAME} \
    -p 80:80 \
    --mount type=bind,src="${SCRIPT_DIR}/nginx/default.conf",target=/etc/nginx/conf.d/default.conf,readonly \
    --tmpfs /tmp:rw,noexec,nosuid,size=64m,uid=101 \
    --tmpfs /var/cache/nginx:rw,noexec,nosuid,size=64m,uid=101 \
    --tmpfs /var/run:rw,noexec,nosuid,size=16m,uid=101 \
    product-frontend

echo ""
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "App is available at: http://localhost/"
