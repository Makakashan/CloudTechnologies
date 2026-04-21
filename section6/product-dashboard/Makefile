SHELL := /bin/sh

PROJECT_ROOT := /home/makakashan/Work/Chmura2026/section6/product-dashboard

.PHONY: up down restart logs ps build network volumes run-postgres run-redis run-api run-nginx clean

up: build network volumes run-postgres run-redis run-api run-nginx ps
	@echo "App is available at: http://localhost/"

build:
	docker build -t product-backend $(PROJECT_ROOT)/backend
	docker build -t product-frontend -f $(PROJECT_ROOT)/frontend/Dockerfile $(PROJECT_ROOT)

network:
	-docker network create product-net

volumes:
	-docker volume create pgdata
	-docker volume create backend-data

run-postgres:
	-docker rm -f postgres 2>/dev/null
	docker run -d \
		--name postgres \
		--network product-net \
		-e POSTGRES_DB=productsdb \
		-e POSTGRES_USER=products \
		-e POSTGRES_PASSWORD=products \
		--mount source=pgdata,target=/var/lib/postgresql/data \
		postgres:16-alpine

run-redis:
	-docker rm -f redis 2>/dev/null
	docker run -d \
		--name redis \
		--network product-net \
		--tmpfs /data:rw,noexec,nosuid,size=64m \
		redis:7-alpine \
		redis-server --save "" --appendonly no

run-api:
	-docker rm -f api 2>/dev/null
	docker run -d \
		--name api \
		--network product-net \
		-e PORT=5000 \
		-e POSTGRES_HOST=postgres \
		-e POSTGRES_PORT=5432 \
		-e POSTGRES_DB=productsdb \
		-e POSTGRES_USER=products \
		-e POSTGRES_PASSWORD=products \
		-e REDIS_URL=redis://redis:6379 \
		--mount source=backend-data,target=/app/data \
		--tmpfs /tmp:rw,noexec,nosuid,size=64m \
		product-backend

run-nginx:
	-docker rm -f nginx 2>/dev/null
	docker run -d \
		--name nginx \
		--network product-net \
		-p 80:8080 \
		--mount type=bind,src=$(PROJECT_ROOT)/nginx/default.conf,target=/etc/nginx/conf.d/default.conf,readonly \
		--tmpfs /tmp:rw,noexec,nosuid,size=64m,uid=101 \
		--tmpfs /var/cache/nginx:rw,noexec,nosuid,size=64m,uid=101 \
		--tmpfs /var/run:rw,noexec,nosuid,size=16m,uid=101 \
		product-frontend

down:
	-docker rm -f nginx
	-docker rm -f api
	-docker rm -f redis
	-docker rm -f postgres

restart: down up

logs:
	@echo "=== postgres ==="
	-docker logs --tail=50 postgres
	@echo "=== redis ==="
	-docker logs --tail=50 redis
	@echo "=== api ==="
	-docker logs --tail=50 api
	@echo "=== nginx ==="
	-docker logs --tail=50 nginx

ps:
	docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

clean: down
	-docker volume rm pgdata
	-docker volume rm backend-data
	-docker network rm product-net
