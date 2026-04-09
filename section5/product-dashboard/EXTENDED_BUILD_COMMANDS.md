# Extended Build Commands

## 1. Przejdź do katalogu projektu

```bash
cd /home/makakashan/Work/Chmura2026/section5/product-dashboard
```

## 2. Ustaw metadane builda

```bash
export BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
export VERSION="v4"
export NODE_ENV="production"
```

## 3. Zbuduj lokalnie backend i sprawdź etykiety OCI

```bash
docker build \
  --build-arg BUILD_DATE="$BUILD_DATE" \
  --build-arg VERSION="$VERSION" \
  --build-arg NODE_ENV="$NODE_ENV" \
  -t product-dashboard-backend:local-oci \
  ./backend
```

```bash
docker inspect product-dashboard-backend:local-oci --format '{{json .Config.Labels}}'
```

## 4. Zbuduj lokalnie frontend i sprawdź etykiety OCI

```bash
docker build \
  --build-arg BUILD_DATE="$BUILD_DATE" \
  --build-arg VERSION="$VERSION" \
  --build-arg NODE_ENV="$NODE_ENV" \
  -f ./frontend/Dockerfile \
  -t product-dashboard-frontend:local-oci \
  .
```

```bash
docker inspect product-dashboard-frontend:local-oci --format '{{json .Config.Labels}}'
```

## 5. Zbuduj i opublikuj backend multiarch jako nową wersję

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg BUILD_DATE="$BUILD_DATE" \
  --build-arg VERSION="$VERSION" \
  --build-arg NODE_ENV="$NODE_ENV" \
  -t docker.io/makakashan/product-dashboard-backend:v4 \
  -t docker.io/makakashan/product-dashboard-backend:latest \
  --push \
  ./backend
```

## 6. Zbuduj i opublikuj frontend multiarch jako nową wersję

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg BUILD_DATE="$BUILD_DATE" \
  --build-arg VERSION="$VERSION" \
  --build-arg NODE_ENV="$NODE_ENV" \
  -f ./frontend/Dockerfile \
  -t docker.io/makakashan/product-dashboard-frontend:v4 \
  -t docker.io/makakashan/product-dashboard-frontend:latest \
  --push \
  .
```

## 7. Sprawdź manifesty multiarch

```bash
docker buildx imagetools inspect docker.io/makakashan/product-dashboard-backend:latest
docker buildx imagetools inspect docker.io/makakashan/product-dashboard-frontend:latest
```

## 8. Porównaj build context z `.dockerignore` i bez niego

Backend z `.dockerignore`:

```bash
docker build --no-cache ./backend
```

Backend bez `.dockerignore`:

```bash
mv ./backend/.dockerignore ./backend/.dockerignore.bak
docker build --no-cache ./backend
mv ./backend/.dockerignore.bak ./backend/.dockerignore
```

Frontend z `.dockerignore`:

```bash
docker build --no-cache -f ./frontend/Dockerfile .
```

Frontend bez `.dockerignore`:

```bash
mv ./.dockerignore ./.dockerignore.bak
docker build --no-cache -f ./frontend/Dockerfile .
mv ./.dockerignore.bak ./.dockerignore
```

Porównuj linię:

```text
transferring context: ...
```

## 9. Test uruchomionych obrazów po pull

```bash
docker network create product-dashboard-net || true
docker rm -f product-dashboard-frontend api-a api-b 2>/dev/null || true
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

```bash
curl http://localhost:8080/api/health
curl http://localhost:8080/api/stats
```
