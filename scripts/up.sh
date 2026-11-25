#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="$ROOT_DIR/.env"
NETWORK="shoplite-test-net"
VOLUME="shoplite-test-pgdata"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "ERROR: .env file is missing."
    echo "Create it from .env.example first."
    exit 1
fi

echo "===== BUILDING DOCKER IMAGES ====="

docker build -t shop-catalog:1.0.0 ./catalog-service
docker build -t shop-inventory:1.0.0 ./inventory-service
docker build -t shop-orders:1.0.0 ./order-service
docker build -t shop-frontend:1.1.0 ./frontend

echo "===== PREPARING NETWORK AND VOLUME ====="

docker network inspect "$NETWORK" >/dev/null 2>&1 || \
    docker network create "$NETWORK"

docker volume inspect "$VOLUME" >/dev/null 2>&1 || \
    docker volume create "$VOLUME"

echo "===== REMOVING OLD MAIN STACK CONTAINERS ====="

for name in \
    shoplite-test-frontend \
    shoplite-test-orders \
    shoplite-test-inventory \
    shoplite-test-catalog \
    shoplite-test-postgres
do
    if docker container inspect "$name" >/dev/null 2>&1; then
        docker stop --time 30 "$name" >/dev/null 2>&1 || true
        docker rm "$name" >/dev/null 2>&1 || true
    fi
done

wait_healthy() {
    local name="$1"
    local timeout="${2:-120}"
    local elapsed=0
    local status=""

    echo "Waiting for $name to become healthy..."

    while (( elapsed < timeout )); do
        status="$(docker inspect "$name" \
            --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' \
            2>/dev/null || echo missing)"

        if [[ "$status" == "healthy" ]]; then
            echo "$name is healthy."
            return 0
        fi

        if [[ "$status" == "unhealthy" || "$status" == "missing" ]]; then
            echo "ERROR: $name status is $status."
            docker logs --tail 50 "$name" || true
            return 1
        fi

        sleep 3
        elapsed=$((elapsed + 3))
    done

    echo "ERROR: Timed out waiting for $name."
    docker logs --tail 50 "$name" || true
    return 1
}

echo "===== STARTING POSTGRESQL ====="

docker run -d \
    --name shoplite-test-postgres \
    --network "$NETWORK" \
    --network-alias postgres \
    --restart unless-stopped \
    --health-cmd 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
    --health-interval 5s \
    --health-timeout 3s \
    --health-start-period 10s \
    --health-retries 10 \
    --env-file "$ENV_FILE" \
    --mount "type=volume,src=$VOLUME,dst=/var/lib/postgresql/data" \
    --mount "type=bind,src=$ROOT_DIR/db/init.sql,dst=/docker-entrypoint-initdb.d/init.sql,readonly" \
    postgres:17-alpine

wait_healthy shoplite-test-postgres 120

echo "===== STARTING CATALOG ====="

docker run -d \
    --name shoplite-test-catalog \
    --network "$NETWORK" \
    --network-alias catalog \
    --restart unless-stopped \
    --env-file "$ENV_FILE" \
    shop-catalog:1.0.0

wait_healthy shoplite-test-catalog 120

echo "===== STARTING INVENTORY ====="

docker run -d \
    --name shoplite-test-inventory \
    --network "$NETWORK" \
    --network-alias inventory \
    --restart unless-stopped \
    --env-file "$ENV_FILE" \
    shop-inventory:1.0.0

wait_healthy shoplite-test-inventory 120

echo "===== STARTING ORDERS ====="

docker run -d \
    --name shoplite-test-orders \
    --network "$NETWORK" \
    --network-alias orders \
    --restart unless-stopped \
    --env-file "$ENV_FILE" \
    shop-orders:1.0.0

wait_healthy shoplite-test-orders 180

echo "===== STARTING FRONTEND ====="

docker run -d \
    --name shoplite-test-frontend \
    --network "$NETWORK" \
    --restart unless-stopped \
    --env-file "$ENV_FILE" \
    -p 18080:8080 \
    shop-frontend:1.1.0

wait_healthy shoplite-test-frontend 120

echo ""
echo "===== SHOPLITE STARTED SUCCESSFULLY ====="
docker ps --filter "name=shoplite-test-"
echo ""
echo "Frontend: http://shoplite.test:18080"
echo "Database volume preserved: $VOLUME"
