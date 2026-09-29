#!/usr/bin/env bash
set -euo pipefail

# Usage:
# deploy-customer-space.sh <env> [customer_space_image]
# env = test|prod
# Example: CUSTOMER_SPACE_API_URL=https://elykia-test.amenouveve-yaveh.com/api \
#            ./deploy-customer-space.sh test ghcr.io/owner/elykia-customer-space:sha123
#
# API URL priority: CUSTOMER_SPACE_API_URL exported by the CI (TEST_API_URL / PROD_API_URL secret)
#   > CUSTOMER_SPACE_API_URL in /opt/elykia/<env>/.env > API_URL in that .env.

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <env> [customer_space_image]" >&2
  exit 2
fi

ENV="$1"
IMAGE_ARG="${2:-}"
CI_API_URL="${CUSTOMER_SPACE_API_URL:-}"

case "$ENV" in
  test|prod) ;;
  *) echo "Error: env must be test or prod (got: $ENV)" >&2; exit 2 ;;
esac

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.customer-space-$ENV.yml"
PROJECT="customer-space-$ENV"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Error: Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

STACK_DIR="/opt/elykia/$ENV"
ENV_FILE="$STACK_DIR/.env"
RELEASES_DIR="$STACK_DIR/releases"
mkdir -p "$RELEASES_DIR"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
else
  echo "Warning: $ENV_FILE not found. Run setup-server.sh first." >&2
  touch "$ENV_FILE"
fi

if [[ -n "$IMAGE_ARG" ]]; then
  CUSTOMER_SPACE_IMAGE="$IMAGE_ARG"
else
  CUSTOMER_SPACE_IMAGE="${CUSTOMER_SPACE_IMAGE:-}"
fi

if [[ -z "$CUSTOMER_SPACE_IMAGE" ]]; then
  echo "Error: CUSTOMER_SPACE_IMAGE must be provided as argument or set in $ENV_FILE" >&2
  exit 1
fi

if [[ -n "$CI_API_URL" ]]; then
  CUSTOMER_SPACE_API_URL="$CI_API_URL"
else
  CUSTOMER_SPACE_API_URL="${CUSTOMER_SPACE_API_URL:-${API_URL:-}}"
fi

if [[ -z "$CUSTOMER_SPACE_API_URL" ]]; then
  echo "Error: CUSTOMER_SPACE_API_URL is empty (CI secret, CUSTOMER_SPACE_API_URL or API_URL in $ENV_FILE)" >&2
  exit 1
fi

set_env_var() {
  key="$1"
  val="$2"
  file="$ENV_FILE"
  if grep -q -E "^${key}=" "$file" 2>/dev/null; then
    # Same approach as deploy.sh: no sed -i (needs directory write permission).
    tmp=$(mktemp)
    sed "s~^${key}=.*~${key}=${val}~" "$file" > "$tmp"
    cat "$tmp" > "$file"
    rm -f "$tmp"
  else
    echo "${key}=${val}" >> "$file"
  fi
}

set_env_var "CUSTOMER_SPACE_IMAGE" "$CUSTOMER_SPACE_IMAGE"
if [[ -n "$CI_API_URL" ]]; then
  set_env_var "CUSTOMER_SPACE_API_URL" "$CUSTOMER_SPACE_API_URL"
fi

export CUSTOMER_SPACE_IMAGE CUSTOMER_SPACE_API_URL

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
RELEASE_FILE="$RELEASES_DIR/customer-space_${ENV}_${TIMESTAMP}.txt"
{
  echo "CUSTOMER_SPACE_IMAGE=$CUSTOMER_SPACE_IMAGE"
  echo "CUSTOMER_SPACE_API_URL=$CUSTOMER_SPACE_API_URL"
  echo "TIMESTAMP=$TIMESTAMP"
} > "$RELEASE_FILE"

echo "DEPLOY CUSTOMER-SPACE WEB: env=$ENV"
echo "Using compose file: $COMPOSE_FILE"
echo "CUSTOMER_SPACE_IMAGE=$CUSTOMER_SPACE_IMAGE"
echo "CUSTOMER_SPACE_API_URL=$CUSTOMER_SPACE_API_URL"

if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
  echo "Logging in to ghcr.io as $GHCR_USERNAME"
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
fi

echo "Pulling image..."
docker compose \
  -f "$COMPOSE_FILE" \
  --project-name "$PROJECT" \
  --env-file "$ENV_FILE" \
  pull

echo "Starting customer-space web..."
docker compose \
  -f "$COMPOSE_FILE" \
  --project-name "$PROJECT" \
  --env-file "$ENV_FILE" \
  up -d

ln -sfn "$RELEASE_FILE" "$RELEASES_DIR/customer-space_${ENV}_current.txt"
echo "Customer-space web deployment finished for env=$ENV"
