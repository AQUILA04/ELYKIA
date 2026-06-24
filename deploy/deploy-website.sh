#!/usr/bin/env bash
set -euo pipefail

# Usage:
# deploy-website.sh <env> [website_image]
# env = test|prod
# Example: ./deploy-website.sh test ghcr.io/owner/elykia-website:sha123
# Example: ./deploy-website.sh prod ghcr.io/owner/elykia-website:latest

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <env> [website_image]" >&2
  exit 2
fi

ENV="$1"
WEBSITE_ARG="${2:-}"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.website-$ENV.yml"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Error: Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

# Stack-specific env
STACK_DIR="/opt/elykia/$ENV"
ENV_FILE="$STACK_DIR/.env"

# Load stack-specific .env if present
if [[ -f "$ENV_FILE" ]]; then
  set -a; source "$ENV_FILE"; set +a
fi

# Determine image
if [[ -n "$WEBSITE_ARG" ]]; then
  WEBSITE_IMAGE="$WEBSITE_ARG"
else
  WEBSITE_IMAGE="${WEBSITE_IMAGE:-}"
fi

if [[ -z "$WEBSITE_IMAGE" ]]; then
  echo "Error: WEBSITE_IMAGE must be provided as argument or set in $ENV_FILE" >&2
  exit 1
fi

export WEBSITE_IMAGE

echo "DEPLOY WEBSITE: env=$ENV"
echo "Using compose file: $COMPOSE_FILE"
echo "WEBSITE_IMAGE=$WEBSITE_IMAGE"

# Login to GHCR if credentials available
if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
  echo "Logging in to ghcr.io as $GHCR_USERNAME"
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
fi

echo "Pulling image..."
docker compose \
  -f "$COMPOSE_FILE" \
  --project-name "website-$ENV" \
  pull

echo "Starting website service..."
docker compose \
  -f "$COMPOSE_FILE" \
  --project-name "website-$ENV" \
  up -d

echo "Website deployment finished for env=$ENV"
