#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ $# -lt 1 ]; then
    echo "Usage: $0 <volume_name> [output_dir]"
    exit 1
fi

VOLUME_NAME=$1
OUTPUT_DIR=${2:-./backups}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="backup_${VOLUME_NAME}_${TIMESTAMP}.tar.gz"

case "${OUTPUT_DIR}" in
    /*) BACKUP_DIR="${OUTPUT_DIR}" ;;
    *) BACKUP_DIR="${SCRIPT_DIR}/${OUTPUT_DIR}" ;;
esac

ARCHIVE_PATH="${BACKUP_DIR}/${ARCHIVE_NAME}"

mkdir -p "${BACKUP_DIR}"

echo "Creating backup of volume '${VOLUME_NAME}'..."
echo "Archive: ${ARCHIVE_PATH}"

docker run --rm \
    --mount source=${VOLUME_NAME},target=/volume_data \
    -v "${BACKUP_DIR}:/backup" \
    alpine:latest \
    tar czf /backup/${ARCHIVE_NAME} -C /volume_data .

echo "Backup created: ${ARCHIVE_PATH}"
ls -lh "${ARCHIVE_PATH}"
