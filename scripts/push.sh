#!/usr/bin/env bash
set -Eeuo pipefail

DOCKERHUB_USERNAME="${DOCKERHUB_USERNAME:-faiz190}"

if [[ -z "$DOCKERHUB_USERNAME" ]]; then
    echo "ERROR: Docker Hub username is required."
    exit 1
fi

echo "===== PUSHING SHOPLITE IMAGES TO DOCKER HUB ====="
echo "Docker Hub account: $DOCKERHUB_USERNAME"

push_image() {
    local source_image="$1"
    local repository="$2"
    local version="$3"
    local target_image="${DOCKERHUB_USERNAME}/${repository}"

    echo ""
    echo "===== PROCESSING ${repository} ====="

    if ! docker image inspect "$source_image" >/dev/null 2>&1; then
        echo "ERROR: Local image not found: $source_image"
        exit 1
    fi

    docker tag "$source_image" "${target_image}:${version}"
    docker tag "$source_image" "${target_image}:latest"

    docker push "${target_image}:${version}"
    docker push "${target_image}:latest"
}

push_image "shop-catalog:1.0.0" "shoplite-catalog" "1.0.0"
push_image "shop-inventory:1.0.0" "shoplite-inventory" "1.0.0"
push_image "shop-orders:1.0.0" "shoplite-orders" "1.0.0"
push_image "shop-frontend:1.1.0" "shoplite-frontend" "1.1.0"

echo ""
echo "===== ALL SHOPLITE IMAGES PUSHED SUCCESSFULLY ====="
