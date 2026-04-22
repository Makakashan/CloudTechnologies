#!/bin/bash

VOLUMES=$(docker volume ls --format "{{.Name}}" | grep -E "(pgdata|backend-data)" || true)

if [ -z "${VOLUMES}" ]; then
    echo "No project volumes found."
    exit 0
fi

for VOLUME in ${VOLUMES}; do
    echo ""
    echo "Volume: ${VOLUME}"
    echo ""

    echo "Docker details:"
    SIZE=$(docker run --rm \
        --mount source=${VOLUME},target=/vol \
        alpine:latest \
        du -sh /vol 2>/dev/null | cut -f1 || echo "unknown")
    echo "  Size: ${SIZE}"

    echo ""
    echo "Active containers using this volume:"
    CONTAINERS=$(docker ps --format "{{.Names}}" --filter volume=${VOLUME})
    if [ -z "${CONTAINERS}" ]; then
        echo "  (none currently running)"
    else
        for C in ${CONTAINERS}; do
            echo "  - ${C}"
        done
    fi
    echo ""
done

VOLUMES=$(docker volume ls --format "{{.Name}}" | grep -E "(pgdata|backend-data)" || false)

if [ -z "${VOLUMES}" ]; then
    echo "No project volumes found."
    exit 0
fi
