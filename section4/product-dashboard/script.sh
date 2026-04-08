#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_NAME="product-dashboard-net"
BACKEND_IMAGE="product-dashboard-backend"
FRONTEND_IMAGE="product-dashboard-frontend"
BACKEND_CONTAINER_A="api-a"
BACKEND_CONTAINER_B="api-b"
FRONTEND_CONTAINER="product-dashboard-frontend"
HOST_PORT="${HOST_PORT:-8080}"
REGISTRY="${REGISTRY:-}"
REGISTRY_NAMESPACE="${REGISTRY_NAMESPACE:-}"
FRONTEND_RELEASE_TAG="${FRONTEND_RELEASE_TAG:-v2}"

registry_image() {
  local image_name="$1"

  if [[ -z "${REGISTRY}" || -z "${REGISTRY_NAMESPACE}" ]]; then
    echo "Set REGISTRY and REGISTRY_NAMESPACE before using registry commands." >&2
    echo "Example: REGISTRY=docker.io REGISTRY_NAMESPACE=myuser ./script.sh push" >&2
    exit 1
  fi

  echo "${REGISTRY}/${REGISTRY_NAMESPACE}/${image_name}"
}

docker_build_cmd() {
  if docker buildx version >/dev/null 2>&1; then
    docker buildx build --load "$@"
  else
    docker build "$@"
  fi
}

build_images() {
  docker_build_cmd \
    -t "${BACKEND_IMAGE}:v1" \
    -t "${BACKEND_IMAGE}:latest" \
    "${ROOT_DIR}/backend"

  docker_build_cmd -f "${ROOT_DIR}/frontend/Dockerfile" \
    -t "${FRONTEND_IMAGE}:${FRONTEND_RELEASE_TAG}" \
    -t "${FRONTEND_IMAGE}:latest" \
    "${ROOT_DIR}"
}

tag_registry_images() {
  local backend_registry_image
  local frontend_registry_image

  backend_registry_image="$(registry_image "${BACKEND_IMAGE}")"
  frontend_registry_image="$(registry_image "${FRONTEND_IMAGE}")"

  docker tag "${BACKEND_IMAGE}:v1" "${backend_registry_image}:v1"
  docker tag "${BACKEND_IMAGE}:latest" "${backend_registry_image}:latest"
  docker tag "${FRONTEND_IMAGE}:${FRONTEND_RELEASE_TAG}" "${frontend_registry_image}:${FRONTEND_RELEASE_TAG}"
  docker tag "${FRONTEND_IMAGE}:latest" "${frontend_registry_image}:latest"
}

push_registry_images() {
  local backend_registry_image
  local frontend_registry_image

  backend_registry_image="$(registry_image "${BACKEND_IMAGE}")"
  frontend_registry_image="$(registry_image "${FRONTEND_IMAGE}")"

  docker push "${backend_registry_image}:v1"
  docker push "${backend_registry_image}:latest"
  docker push "${frontend_registry_image}:${FRONTEND_RELEASE_TAG}"
  docker push "${frontend_registry_image}:latest"
}

pull_registry_images() {
  local backend_registry_image
  local frontend_registry_image

  backend_registry_image="$(registry_image "${BACKEND_IMAGE}")"
  frontend_registry_image="$(registry_image "${FRONTEND_IMAGE}")"

  docker pull "${backend_registry_image}:latest"
  docker pull "${frontend_registry_image}:latest"
}

remove_local_images() {
  local backend_registry_image=""
  local frontend_registry_image=""

  docker image rm -f "${BACKEND_IMAGE}:v1" "${BACKEND_IMAGE}:latest" >/dev/null 2>&1 || true
  docker image rm -f "${FRONTEND_IMAGE}:${FRONTEND_RELEASE_TAG}" "${FRONTEND_IMAGE}:latest" >/dev/null 2>&1 || true

  if [[ -n "${REGISTRY}" && -n "${REGISTRY_NAMESPACE}" ]]; then
    backend_registry_image="$(registry_image "${BACKEND_IMAGE}")"
    frontend_registry_image="$(registry_image "${FRONTEND_IMAGE}")"
    docker image rm -f "${backend_registry_image}:v1" "${backend_registry_image}:latest" >/dev/null 2>&1 || true
    docker image rm -f "${frontend_registry_image}:${FRONTEND_RELEASE_TAG}" "${frontend_registry_image}:latest" >/dev/null 2>&1 || true
  fi
}

ensure_network() {
  if ! docker network inspect "${NETWORK_NAME}" >/dev/null 2>&1; then
    docker network create "${NETWORK_NAME}" >/dev/null
  fi
}

remove_container_if_exists() {
  local name="$1"
  if docker ps -a --format '{{.Names}}' | grep -Fxq "${name}"; then
    docker rm -f "${name}" >/dev/null
  fi
}

start_stack() {
  ensure_network
  remove_container_if_exists "${BACKEND_CONTAINER_A}"
  remove_container_if_exists "${BACKEND_CONTAINER_B}"
  remove_container_if_exists "${FRONTEND_CONTAINER}"

  docker run -d \
    --name "${BACKEND_CONTAINER_A}" \
    --network "${NETWORK_NAME}" \
    --network-alias api-a \
    -e INSTANCE_ID=api-a \
    "${BACKEND_IMAGE}:latest" >/dev/null

  docker run -d \
    --name "${BACKEND_CONTAINER_B}" \
    --network "${NETWORK_NAME}" \
    --network-alias api-b \
    -e INSTANCE_ID=api-b \
    "${BACKEND_IMAGE}:latest" >/dev/null

  docker run -d \
    --name "${FRONTEND_CONTAINER}" \
    --network "${NETWORK_NAME}" \
    -p "${HOST_PORT}:80" \
    "${FRONTEND_IMAGE}:latest" >/dev/null

  echo "App started at http://localhost:${HOST_PORT}"
}

start_registry_stack() {
  local backend_registry_image
  local frontend_registry_image

  backend_registry_image="$(registry_image "${BACKEND_IMAGE}")"
  frontend_registry_image="$(registry_image "${FRONTEND_IMAGE}")"

  ensure_network
  remove_container_if_exists "${BACKEND_CONTAINER_A}"
  remove_container_if_exists "${BACKEND_CONTAINER_B}"
  remove_container_if_exists "${FRONTEND_CONTAINER}"

  docker run -d \
    --name "${BACKEND_CONTAINER_A}" \
    --network "${NETWORK_NAME}" \
    --network-alias api-a \
    -e INSTANCE_ID=api-a \
    "${backend_registry_image}:latest" >/dev/null

  docker run -d \
    --name "${BACKEND_CONTAINER_B}" \
    --network "${NETWORK_NAME}" \
    --network-alias api-b \
    -e INSTANCE_ID=api-b \
    "${backend_registry_image}:latest" >/dev/null

  docker run -d \
    --name "${FRONTEND_CONTAINER}" \
    --network "${NETWORK_NAME}" \
    -p "${HOST_PORT}:80" \
    "${frontend_registry_image}:latest" >/dev/null

  echo "Registry app started at http://localhost:${HOST_PORT}"
}

stop_stack() {
  remove_container_if_exists "${FRONTEND_CONTAINER}"
  remove_container_if_exists "${BACKEND_CONTAINER_A}"
  remove_container_if_exists "${BACKEND_CONTAINER_B}"
}

test_stack() {
  echo "Testing /"
  curl -i "http://localhost:${HOST_PORT}/"
  echo
  echo "Testing /products"
  curl -i "http://localhost:${HOST_PORT}/products"
  echo
  echo "Testing /stats"
  curl -i "http://localhost:${HOST_PORT}/stats"
  echo
  echo "Testing /api/stats"
  curl -i "http://localhost:${HOST_PORT}/api/stats"
  echo
}

show_logs() {
  echo "===== ${BACKEND_CONTAINER_A} ====="
  docker logs "${BACKEND_CONTAINER_A}"
  echo
  echo "===== ${BACKEND_CONTAINER_B} ====="
  docker logs "${BACKEND_CONTAINER_B}"
  echo
  echo "===== ${FRONTEND_CONTAINER} ====="
  docker logs "${FRONTEND_CONTAINER}"
}

usage() {
  cat <<'EOF'
Usage:
  ./script.sh build       Build backend and frontend images
  ./script.sh tag         Tag images for the registry
  ./script.sh push        Push registry-tagged images
  ./script.sh pull        Pull images from the registry
  ./script.sh clean-images Remove local images
  ./script.sh start       Start two backend instances and the frontend on localhost:8080
  ./script.sh start-registry Start the scaled stack from registry images
  ./script.sh stop        Stop and remove running containers
  ./script.sh restart     Restart the stack
  ./script.sh test        Test /, /products, /stats and /api/stats
  ./script.sh logs        Show logs from api-a, api-b and frontend
  ./script.sh up          Build and start the stack
  ./script.sh release     Build, tag and push images
  ./script.sh redeploy    Stop containers, remove local images, pull from registry and start

Optional:
  HOST_PORT=8090 ./script.sh start
  REGISTRY=docker.io REGISTRY_NAMESPACE=myuser ./script.sh release
EOF
}

case "${1:-}" in
  build)
    build_images
    ;;
  tag)
    tag_registry_images
    ;;
  push)
    push_registry_images
    ;;
  pull)
    pull_registry_images
    ;;
  clean-images)
    remove_local_images
    ;;
  start)
    start_stack
    ;;
  start-registry)
    start_registry_stack
    ;;
  stop)
    stop_stack
    ;;
  restart)
    stop_stack
    start_stack
    ;;
  test)
    test_stack
    ;;
  logs)
    show_logs
    ;;
  up)
    build_images
    start_stack
    ;;
  release)
    build_images
    tag_registry_images
    push_registry_images
    ;;
  redeploy)
    stop_stack
    remove_local_images
    pull_registry_images
    start_registry_stack
    ;;
  *)
    usage
    exit 1
    ;;
esac
