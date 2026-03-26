# Product Dashboard

This project contains a React frontend, two Node.js/Express backend instances running from the same image, and an Nginx configuration for serving the SPA and proxying API requests through an upstream block.

## Project Structure

```text
product-dashboard/
├── backend/
├── frontend/
├── nginx/
├── script.sh
└── SCRIPT_USAGE.md
```

## Local Run

Build and start the full stack:

```bash
cd "/home/makakashan/Documents/My Favourite Ug/Chmura2026/sekction4/product-dashboard"
./script.sh up
```

The application will be available at:

- `http://localhost:8080`
- `http://localhost:8080/products`
- `http://localhost:8080/stats`

Run endpoint checks:

```bash
./script.sh test
```

Stop the stack:

```bash
./script.sh stop
```

## Registry Release

Log in to Docker Hub:

```bash
docker login
```

Build, tag, and push the images:

```bash
REGISTRY=docker.io REGISTRY_NAMESPACE=makakashan ./script.sh release
```

This publishes:

- `docker.io/makakashan/product-dashboard-backend:v1`
- `docker.io/makakashan/product-dashboard-backend:latest`
- `docker.io/makakashan/product-dashboard-frontend:v2`
- `docker.io/makakashan/product-dashboard-frontend:latest`

## Redeploy From Pulled Images Only

To verify that the solution works after removing local images and downloading them again from the registry:

```bash
REGISTRY=docker.io REGISTRY_NAMESPACE=makakashan ./script.sh redeploy
```

This command:

- stops running containers,
- removes local Docker images,
- pulls the images from the registry,
- starts the environment again using the pulled images.

After redeploy:

```bash
REGISTRY=docker.io REGISTRY_NAMESPACE=makakashan ./script.sh test
```

## Helper Commands

- `./script.sh build` - Build the backend image and frontend `v2` image
- `./script.sh start` - Start `api-a`, `api-b`, and the frontend
- `./script.sh stop` - Stop and remove containers
- `./script.sh restart` - Restart the stack
- `./script.sh logs` - Show logs for `api-a`, `api-b`, and the frontend
- `./script.sh tag` - Tag images for the registry
- `./script.sh push` - Push images to the registry
- `./script.sh pull` - Pull images from the registry
- `./script.sh clean-images` - Remove local images
- `./script.sh start-registry` - Start using registry images
