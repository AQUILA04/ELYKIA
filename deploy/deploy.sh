#!/usr/bin/env bash
set -euo pipefail

# Usage:
# deploy.sh <env> [frontend_image] [backend_image]
# env = test|prod
# Exemple: ./deploy.sh test ghcr.io/OWNER/ELYKIA-frontend:1.2.3 ghcr.io/OWNER/ELYKIA-backend:1.2.3
# Vous pouvez aussi omettre les images si elles sont définies dans deploy/.env

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <env> [frontend_image] [backend_image]" >&2
  exit 2
fi

ENV="$1"
FRONTEND_ARG="${2:-}"
BACKEND_ARG="${3:-}"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.$ENV.yml"
RELEASES_DIR="$ROOT_DIR/releases"
mkdir -p "$RELEASES_DIR"

# Load existing .env if present (do not fail if absent)
ENV_FILE="$ROOT_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

# Determine images: prefer CLI args, fall back to values from .env
if [[ -n "$FRONTEND_ARG" ]]; then
  FRONTEND_IMAGE="$FRONTEND_ARG"
else
  FRONTEND_IMAGE="${FRONTEND_IMAGE:-}"
fi

if [[ -n "$BACKEND_ARG" ]]; then
  BACKEND_IMAGE="$BACKEND_ARG"
else
  BACKEND_IMAGE="${BACKEND_IMAGE:-}"
fi

if [[ -z "$FRONTEND_IMAGE" || -z "$BACKEND_IMAGE" ]]; then
  echo "Error: FRONTEND_IMAGE and BACKEND_IMAGE must be provided either as arguments or set in $ENV_FILE" >&2
  echo "Usage: $0 <env> [frontend_image] [backend_image]" >&2
  exit 1
fi

# Ensure .env exists and update only the image variables when CLI args are provided
touch "$ENV_FILE"
chmod 600 "$ENV_FILE" || true

set_env_var() {
  key="$1"
  val="$2"
  file="$ENV_FILE"
  if grep -q -E "^${key}=" "$file" 2>/dev/null; then
    # sed -i needs directory write permission (temp file in same dir).
    # Instead, write to /tmp then overwrite the file in-place with cat,
    # which only requires write permission on the file itself.
    tmp=$(mktemp)
    sed "s~^${key}=.*~${key}=${val}~" "$file" > "$tmp"
    cat "$tmp" > "$file"
    rm -f "$tmp"
  else
    echo "${key}=${val}" >> "$file"
  fi
}

# If images were provided on CLI, persist them to .env; otherwise keep existing values
if [[ -n "$FRONTEND_ARG" ]]; then
  set_env_var "FRONTEND_IMAGE" "$FRONTEND_IMAGE"
fi
if [[ -n "$BACKEND_ARG" ]]; then
  set_env_var "BACKEND_IMAGE" "$BACKEND_IMAGE"
fi

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
RELEASE_FILE="$RELEASES_DIR/${ENV}_${TIMESTAMP}.txt"

echo "DEPLOY: env=$ENV"
echo "Using compose file: $COMPOSE_FILE"

# Note: .env updated only for provided image args above; other variables remain intact

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

