# Product Dashboard - Start Commands

## 1. Przejdź do katalogu projektu

```bash
cd /home/makakashan/Work/Chmura2026/section5/product-dashboard
```

## 2. Zaloguj się do Docker Hub

```bash
docker login -u makakashan
```

## 3. Utwórz i uruchom builder `buildx`

```bash
docker buildx create --name multiarch --use --driver docker-container
docker buildx inspect --bootstrap
docker buildx ls
```

## 4. Zbuduj i opublikuj backend jako obraz wieloplatformowy

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t docker.io/makakashan/product-dashboard-backend:v1 \
  -t docker.io/makakashan/product-dashboard-backend:latest \
  --push \
  ./backend
```

## 5. Zbuduj i opublikuj frontend jako obraz wieloplatformowy

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f ./frontend/Dockerfile \
  -t docker.io/makakashan/product-dashboard-frontend:v3 \
  -t docker.io/makakashan/product-dashboard-frontend:latest \
  --push \
  .
```

## 6. Sprawdź manifesty obrazów

```bash
docker buildx imagetools inspect docker.io/makakashan/product-dashboard-backend:latest
docker buildx imagetools inspect docker.io/makakashan/product-dashboard-frontend:latest
```

W wyniku mają być widoczne:

```text
linux/amd64
linux/arm64
```

## 7. Uruchom aplikację z obrazów pobranych z rejestru

```bash
docker network create product-dashboard-net || true
```

```bash
docker rm -f product-dashboard-frontend api-a api-b 2>/dev/null || true
docker image rm docker.io/makakashan/product-dashboard-frontend:latest 2>/dev/null || true
docker image rm docker.io/makakashan/product-dashboard-backend:latest 2>/dev/null || true
docker pull docker.io/makakashan/product-dashboard-backend:latest
docker pull docker.io/makakashan/product-dashboard-frontend:latest
```

```bash
docker run -d --name api-a \
  --network product-dashboard-net \
  --network-alias api-a \
  -e INSTANCE_ID=api-a \
  docker.io/makakashan/product-dashboard-backend:latest
```

```bash
docker run -d --name api-b \
  --network product-dashboard-net \
  --network-alias api-b \
  -e INSTANCE_ID=api-b \
  docker.io/makakashan/product-dashboard-backend:latest
```

```bash
docker run -d --name product-dashboard-frontend \
  --network product-dashboard-net \
  -p 8080:8080 \
  docker.io/makakashan/product-dashboard-frontend:latest
```

## 8. Test działania aplikacji

```bash
docker ps -a
docker logs product-dashboard-frontend
curl http://localhost:8080/api/health
curl http://localhost:8080/api/stats
```

## 9. Dodatkowe testy backendu z wnętrza kontenerów

```bash
docker exec api-a wget -qO- http://127.0.0.1:5000/health
docker exec api-b wget -qO- http://127.0.0.1:5000/stats
```

## 10. Sprzątanie

```bash
docker rm -f product-dashboard-frontend api-a api-b
docker network rm product-dashboard-net
```
