# Product Dashboard - Section 5

Rozszerzona wersja aplikacji z `sekction4/product-dashboard` przygotowana pod:

- nowe endpointy diagnostyczne backendu,
- rozbudowany widok statystyk we frontendzie,
- wieloetapowe Dockerfile,
- budowanie obrazów wieloplatformowych `linux/amd64` i `linux/arm64`.

## Struktura katalogów

```text
section5/product-dashboard/
├── .dockerignore
├── backend
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── package.json
│   └── src
│       └── server.js
├── frontend
│   ├── Dockerfile
│   ├── package.json
│   ├── public
│   │   └── index.html
│   └── src
│       ├── App.css
│       ├── App.js
│       └── index.js
├── nginx
│   └── default.conf
├── script.sh
└── SCRIPT_USAGE.md
```

## Multiarch buildx

Przykładowe polecenia po zalogowaniu do rejestru:

```bash
docker buildx create --name multiarch --use
docker buildx inspect --bootstrap

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t docker.io/TWOJ_LOGIN/product-dashboard-backend:v1 \
  -t docker.io/TWOJ_LOGIN/product-dashboard-backend:latest \
  --push \
  ./backend

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f ./frontend/Dockerfile \
  -t docker.io/TWOJ_LOGIN/product-dashboard-frontend:v3 \
  -t docker.io/TWOJ_LOGIN/product-dashboard-frontend:latest \
  --push \
  .
```

## Weryfikacja manifestu

```bash
docker buildx imagetools inspect docker.io/TWOJ_LOGIN/product-dashboard-backend:latest
docker buildx imagetools inspect docker.io/TWOJ_LOGIN/product-dashboard-frontend:latest
```

W odpowiedzi `imagetools inspect` powinny pojawić się obie platformy:

- `linux/amd64`
- `linux/arm64`

## Test po pobraniu obrazów

```bash
docker network create product-dashboard-net || true

docker run -d --name api-a --network product-dashboard-net --network-alias api-a \
  -e INSTANCE_ID=api-a docker.io/TWOJ_LOGIN/product-dashboard-backend:latest

docker run -d --name api-b --network product-dashboard-net --network-alias api-b \
  -e INSTANCE_ID=api-b docker.io/TWOJ_LOGIN/product-dashboard-backend:latest

docker run -d --name product-dashboard-frontend --network product-dashboard-net \
  -p 8080:8080 docker.io/TWOJ_LOGIN/product-dashboard-frontend:latest

curl http://localhost:8080/api/health
curl http://localhost:8080/api/stats
```
