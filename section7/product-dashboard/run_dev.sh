#!/bin/bash
set -e

NETWORK_NAME="product-net"
POSTGRES_VOLUME="pgdata"

docker network create ${NETWORK_NAME} 2>/dev/null || true
docker volume create ${POSTGRES_VOLUME} 2>/dev/null || true

# Start PostgreSQL if not running
if ! docker ps --format '{{.Names}}' | grep -q "^postgres$"; then
    echo "=== Starting PostgreSQL ==="
    docker rm -f postgres 2>/dev/null || true
    docker run -d \
        --name postgres \
        --network ${NETWORK_NAME} \
        -e POSTGRES_DB=productsdb \
        -e POSTGRES_USER=products \
        -e POSTGRES_PASSWORD=products \
        --mount source=${POSTGRES_VOLUME},target=/var/lib/postgresql/data \
        postgres:16-alpine
    sleep 3
fi

# Start Redis if not running
if ! docker ps --format '{{.Names}}' | grep -q "^redis$"; then
    echo "=== Starting Redis ==="
    docker rm -f redis 2>/dev/null || true
    docker run -d \
        --name redis \
        --network ${NETWORK_NAME} \
        --tmpfs /data:rw,noexec,nosuid,size=64m \
        redis:7-alpine \
        redis-server --save "" --appendonly no
fi

echo "=== Starting Backend in DEV mode ==="
docker rm -f api-dev 2>/dev/null || true

# Install nodemon locally if not present
if [ ! -d "./backend/node_modules/nodemon" ]; then
    echo "Installing nodemon..."
    cd backend && npm install --save-dev nodemon && cd ..
fi

docker run -d \
    --name api-dev \
    --network ${NETWORK_NAME} \
    -e PORT=3000 \
    -e POSTGRES_HOST=postgres \
    -e POSTGRES_PORT=5432 \
    -e POSTGRES_DB=productsdb \
    -e POSTGRES_USER=products \
    -e POSTGRES_PASSWORD=products \
    -e REDIS_URL=redis://redis:6379 \
    -e NODE_ENV=development \
    --mount type=bind,src=$(pwd)/backend/src,target=/app/src \
    --mount type=bind,src=$(pwd)/backend/package.json,target=/app/package.json,readonly \
    -v $(pwd)/backend/node_modules:/app/node_modules \
    --tmpfs /tmp:rw,noexec,nosuid,size=64m \
    -w /app \
    node:20-alpine \
    npx nodemon --watch src --ext js --exec "node src/server.js"

echo ""
echo "Dev backend started. Watching $(pwd)/backend/src/"
echo "Modify src/server.js and see changes without docker build!"
echo ""
docker logs -f api-dev
