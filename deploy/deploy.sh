#!/usr/bin/env bash
set -euo pipefail

# Usage:
# deploy.sh <env> <frontend_image> <backend_image>
# env = test|prod
# Exemple: ./deploy.sh test ghcr.io/OWNER/ELYKIA-frontend:1.2.3 ghcr.io/OWNER/ELYKIA-backend:1.2.3

ENV="$1"
FRONTEND_IMAGE="$2"
BACKEND_IMAGE="$3"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.$ENV.yml"
RELEASES_DIR="$ROOT_DIR/releases"
mkdir -p "$RELEASES_DIR"

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
RELEASE_FILE="$RELEASES_DIR/${ENV}_${TIMESTAMP}.txt"

echo "DEPLOY: env=$ENV"
echo "Using compose file: $COMPOSE_FILE"

cat > "$ROOT_DIR/.env" <<EOF
FRONTEND_IMAGE=$FRONTEND_IMAGE
BACKEND_IMAGE=$BACKEND_IMAGE
EOF

echo "Saving release metadata to $RELEASE_FILE"
echo "FRONTEND_IMAGE=$FRONTEND_IMAGE" > "$RELEASE_FILE"
echo "BACKEND_IMAGE=$BACKEND_IMAGE" >> "$RELEASE_FILE"
echo "TIMESTAMP=$TIMESTAMP" >> "$RELEASE_FILE"

echo "Pulling images..."
# If GHCR credentials are provided in the environment, attempt to login so private images can be pulled
if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
  echo "Logging in to ghcr.io as $GHCR_USERNAME"
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
fi

docker compose -f "$COMPOSE_FILE" pull

echo "Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

echo "Deployment finished. Latest release metadata:"
tail -n +1 "$RELEASE_FILE"

echo "Touching current pointer"
ln -sfn "$RELEASE_FILE" "$RELEASES_DIR/${ENV}_current.txt"

echo "Done"

