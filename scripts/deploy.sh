#!/usr/bin/env bash
set -Eeuo pipefail

AWS_PROFILE="${AWS_PROFILE:-shoplite-friend}"
AWS_REGION="${AWS_REGION:-eu-north-1}"
AWS_ACCOUNT_ID="853354223743"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "===== SHOPLITE AWS ECR DEPLOYMENT ====="
echo "AWS Profile: $AWS_PROFILE"
echo "AWS Region: $AWS_REGION"
echo "ECR Registry: $ECR_REGISTRY"

# Check required commands
for command in docker aws; do
    if ! command -v "$command" >/dev/null 2>&1; then
        echo "ERROR: Required command not found: $command"
        exit 1
    fi
done

# Verify AWS account
echo ""
echo "===== VERIFYING AWS IDENTITY ====="

ACTUAL_ACCOUNT_ID="$(
    aws sts get-caller-identity \
        --profile "$AWS_PROFILE" \
        --query Account \
        --output text
)"

if [[ "$ACTUAL_ACCOUNT_ID" != "$AWS_ACCOUNT_ID" ]]; then
    echo "ERROR: AWS account mismatch."
    echo "Expected: $AWS_ACCOUNT_ID"
    echo "Actual:   $ACTUAL_ACCOUNT_ID"
    exit 1
fi

echo "AWS account verified: $ACTUAL_ACCOUNT_ID"

# Authenticate Docker with ECR
echo ""
echo "===== AUTHENTICATING WITH AWS ECR ====="

aws ecr get-login-password \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    | docker login \
        --username AWS \
        --password-stdin "$ECR_REGISTRY"

# Tag and push an image
push_image() {
    local source_image="$1"
    local repository="$2"
    local version="$3"
    local target_image="${ECR_REGISTRY}/${repository}"

    echo ""
    echo "===== DEPLOYING ${repository} ====="

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
echo "===== ALL SHOPLITE IMAGES DEPLOYED TO AWS ECR ====="
