#!/usr/bin/env bash
set -Eeuo pipefail

echo "===== STOPPING SHOPLITE ====="

for name in \
    shoplite-test-frontend \
    shoplite-test-orders \
    shoplite-test-inventory \
    shoplite-test-catalog \
    shoplite-test-postgres
do
    if docker container inspect "$name" >/dev/null 2>&1; then
        echo "Stopping $name gracefully..."
        docker stop --timeout 30 "$name"
        docker rm "$name"
    else
        echo "$name is not present."
    fi
done

echo ""
echo "ShopLite containers have been removed."
echo "Database volume has NOT been deleted."
echo "Docker network has NOT been deleted."
echo "Frontend preview on port 18081 has NOT been touched."
