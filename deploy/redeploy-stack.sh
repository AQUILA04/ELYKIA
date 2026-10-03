#!/usr/bin/env bash
set -euo pipefail

# Usage:
# redeploy-stack.sh [--force-update | -fu] <env>
# env = test|prod
#
# Redeploys every Elykia stack of <env> with the images already recorded in /opt/elykia/<env>/.env
# (no new image, no CI needed):
#   1. main stack (frontend / backend / db)        -> deploy.sh <env>
#   2. customer-space web, if CUSTOMER_SPACE_IMAGE -> deploy-customer-space.sh <env>
#   3. website, if WEBSITE_IMAGE                   -> deploy-website.sh <env>
#
# Typical use: bring the test environment back after the CD promote stopped it.
#   /opt/elykia/deploy/redeploy-stack.sh test

usage() {
  echo "Usage: $0 [--force-update | -fu] <env>" >&2
  exit 2
}

if [[ "${1:-}" == "--force-update" || "${1:-}" == "-fu" ]]; then
  shift
  [[ "$#" -eq 1 ]] || usage
  echo "Force update requested. Updating deploy scripts..."
  curl -fsSL --proto '=https' --tlsv1.2 https://raw.githubusercontent.com/AQUILA04/ELYKIA/main/deploy/update-deploy.sh | bash
  echo "Re-executing updated redeploy-stack.sh..."
  exec bash /opt/elykia/deploy/redeploy-stack.sh "$@"
fi

[[ "$#" -eq 1 ]] || usage
ENV="$1"

case "$ENV" in
  test|prod) ;;
  *) echo "Error: env must be test or prod (got: $ENV)" >&2; exit 2 ;;
esac

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="/opt/elykia/$ENV/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found. Run setup-server.sh first." >&2
  exit 1
fi

env_value() {
  sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1
}

echo "=== [1/3] Main stack elykia-$ENV (frontend / backend / db)"
bash "$ROOT_DIR/deploy.sh" "$ENV"

echo "=== [2/3] Customer-space web"
if [[ -n "$(env_value CUSTOMER_SPACE_IMAGE)" ]]; then
  bash "$ROOT_DIR/deploy-customer-space.sh" "$ENV"
else
  echo "CUSTOMER_SPACE_IMAGE not set in $ENV_FILE: skipped (never deployed on $ENV)."
fi

echo "=== [3/3] Website"
if [[ -n "$(env_value WEBSITE_IMAGE)" ]]; then
  bash "$ROOT_DIR/deploy-website.sh" "$ENV"
else
  echo "WEBSITE_IMAGE not set in $ENV_FILE: skipped (recorded by the next website deploy)."
fi

echo "=== Containers"
docker ps --format '{{.Label "com.docker.compose.project"}}\t{{.Names}}\t{{.Status}}' \
  | awk -F'\t' -v env="$ENV" \
      '$1 == "elykia-" env || $1 == "customer-space-" env || $1 == "website-" env { print $2 "\t" $3 }'

echo "Redeploy finished for env=$ENV"
