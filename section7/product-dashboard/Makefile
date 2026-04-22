SHELL := /bin/sh

PROJECT_ROOT := /home/makakashan/Work/Chmura2026/section7/product-dashboard

.PHONY: up down restart logs ps build network volumes \
        run-postgres run-redis run-backend-1 run-backend-2 run-worker run-nginx \
        clean buildx-v2 demo-host demo-none demo-dns inspect

# === BUILD ===

build:
	docker build --no-cache -t product-backend $(PROJECT_ROOT)/backend
	docker build --no-cache -t product-frontend -f $(PROJECT_ROOT)/frontend/Dockerfile $(PROJECT_ROOT)

# === NETWORKS ===

network:
	-docker network create --gateway 172.20.0.1 --subnet 172.20.0.0/24 proxy-net
	-docker network create --gateway 172.21.0.1 --subnet 172.21.0.0/24 app-net
	-docker network create --gateway 172.22.0.1 --subnet 172.22.0.0/24 db-net

# === VOLUMES ===

volumes:
	-docker volume create pgdata
	-docker volume create backend-data

# === CONTAINERS ===

run-postgres:
	-docker rm -f postgres 2>/dev/null
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

run-redis:
	-docker rm -f redis 2>/dev/null
	docker run -d \
		--name redis \
		--network app-net \
		--ip 172.21.0.10 \
		--tmpfs /data:rw,noexec,nosuid,size=64m \
		redis:7-alpine \
		redis-server --save "" --appendonly no

run-backend-1:
	-docker rm -f backend_1 2>/dev/null
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

run-backend-2:
	-docker rm -f backend_2 2>/dev/null
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

run-worker:
	-docker rm -f worker 2>/dev/null
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
		--no-healthcheck \
		product-backend \
		node src/server.js

run-nginx:
	-docker rm -f nginx 2>/dev/null
	docker run -d \
		--name nginx \
		--network proxy-net \
		--ip 172.20.0.10 \
		-p 80:80 \
		--mount type=bind,src=$(PROJECT_ROOT)/nginx/default.conf,target=/etc/nginx/conf.d/default.conf,readonly \
		--tmpfs /tmp:rw,noexec,nosuid,size=64m,uid=101 \
		--tmpfs /var/cache/nginx:rw,noexec,nosuid,size=64m,uid=101 \
		--tmpfs /var/run:rw,noexec,nosuid,size=16m,uid=101 \
		product-frontend

# === MAIN TARGETS ===

up: build network volumes run-postgres run-redis run-backend-1 run-backend-2 run-worker run-nginx ps
	@echo ""
	@echo "App is available at: http://localhost/"
	@echo ""
	@echo "Network assignments:"
	@docker network inspect proxy-net --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{println}}{{end}}' 2>/dev/null || true
	@docker network inspect app-net --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{println}}{{end}}' 2>/dev/null || true
	@docker network inspect db-net --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{println}}{{end}}' 2>/dev/null || true

down:
	-docker rm -f nginx
	-docker rm -f worker
	-docker rm -f backend_2
	-docker rm -f backend_1
	-docker rm -f redis
	-docker rm -f postgres

restart: down up

logs:
	@echo "=== postgres ==="
	-docker logs --tail=30 postgres
	@echo "=== redis ==="
	-docker logs --tail=30 redis
	@echo "=== backend_1 ==="
	-docker logs --tail=30 backend_1
	@echo "=== backend_2 ==="
	-docker logs --tail=30 backend_2
	@echo "=== worker ==="
	-docker logs --tail=30 worker
	@echo "=== nginx ==="
	-docker logs --tail=30 nginx

ps:
	docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

clean: down
	-docker volume rm pgdata
	-docker volume rm backend-data
	-docker network rm proxy-net
	-docker network rm app-net
	-docker network rm db-net

# === BUILDX ===

buildx-v2:
	docker buildx create --name multiplatform --use 2>/dev/null || true
	docker buildx build \
		--platform linux/amd64,linux/arm64 \
		-t makakashan/product-backend:v2 \
		--build-arg VERSION=v2 \
		--push \
		$(PROJECT_ROOT)/backend
	docker buildx build \
		--platform linux/amd64,linux/arm64 \
		-t makakashan/product-frontend:v2 \
		--build-arg VERSION=v2 \
		--push \
		-f $(PROJECT_ROOT)/frontend/Dockerfile $(PROJECT_ROOT)
	docker buildx imagetools inspect makakashan/product-backend:v2
	docker buildx imagetools inspect makakashan/product-frontend:v2

# === DEMO TARGETS ===

demo-host:
	@echo "=== Network HOST demo ==="
	docker run --rm --network host alpine:latest sh -c "wget -qO- http://127.0.0.1:80/ 2>/dev/null || echo 'Host network sees host ports'"

demo-none:
	@echo "=== Network NONE demo ==="
	docker run --rm --network none alpine:latest ip addr

demo-dns:
	@echo "=== Default bridge (NO DNS) ==="
	-docker rm -f test_default_1 test_default_2 2>/dev/null
	docker run -d --name test_default_1 --network bridge alpine:latest sleep 60
	docker run -d --name test_default_2 --network bridge alpine:latest sleep 60
	@echo "Ping by name (should FAIL):"
	@docker exec test_default_1 sh -c "ping -c 1 test_default_2 2>/dev/null && echo OK || echo FAIL"
	@echo "Ping by IP (should OK):"
	@docker exec test_default_1 sh -c "ping -c 1 $$(docker inspect test_default_2 --format '{{.NetworkSettings.IPAddress}}') 2>/dev/null && echo OK || echo FAIL"
	-docker rm -f test_default_1 test_default_2
	@echo ""
	@echo "=== Custom bridge (DNS works) ==="
	-docker network rm test-custom-net 2>/dev/null
	docker network create test-custom-net
	docker run -d --name test_custom_1 --network test-custom-net alpine:latest sleep 60
	docker run -d --name test_custom_2 --network test-custom-net alpine:latest sleep 60
	@echo "Ping by name (should OK):"
	@docker exec test_custom_1 sh -c "ping -c 1 test_custom_2 2>/dev/null && echo OK || echo FAIL"
	-docker rm -f test_custom_1 test_custom_2
	-docker network rm test-custom-net

# === INSPECT ===

inspect:
	@echo "=== proxy-net ==="
	docker network inspect proxy-net
	@echo ""
	@echo "=== app-net ==="
	docker network inspect app-net
	@echo ""
	@echo "=== db-net ==="
	docker network inspect db-net
