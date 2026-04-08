# `script.sh` Commands

- `./script.sh build` - Builds the backend image and the updated frontend image tagged as `v2` and `latest`.
- `./script.sh tag` - Tags the images for a container registry.
- `./script.sh push` - Pushes the tagged images to the registry.
- `./script.sh pull` - Pulls the images from the registry.
- `./script.sh clean-images` - Removes local Docker images.
- `./script.sh start` - Starts two backend instances (`api-a`, `api-b`) and the frontend container.
- `./script.sh start-registry` - Starts the two-backend stack using images pulled from the registry.
- `./script.sh stop` - Stops and removes the running containers.
- `./script.sh restart` - Restarts the full stack.
- `./script.sh test` - Tests `/`, `/products`, `/stats`, and `/api/stats`.
- `./script.sh logs` - Shows logs for `api-a`, `api-b`, and the frontend container.
- `./script.sh up` - Builds the images and starts the full stack.
- `./script.sh release` - Builds, tags, and pushes the images to the registry.
- `./script.sh redeploy` - Removes local images, pulls them from the registry, and starts the stack again.

## Registry Variables

Set these variables before running registry-related commands:

- `REGISTRY` - Registry host, for example `docker.io`
- `REGISTRY_NAMESPACE` - Registry namespace or username

Example:

```bash
REGISTRY=docker.io REGISTRY_NAMESPACE=makakashan ./script.sh release
REGISTRY=docker.io REGISTRY_NAMESPACE=makakashan ./script.sh redeploy
```
