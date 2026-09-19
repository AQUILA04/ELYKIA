#!/usr/bin/env bash
# Align host bind-mount dirs with backend image user `app` (pinned UID 999 / GID 999).
# Alpine images used 100:101; Debian temurin uses 999:999. A leftover chown crash-loops
# Logback (Permission denied) and Traefik then serves the Angular SPA on /api (login fails).
#
# Usage: fix-backend-bind-mounts.sh <test|prod> [env_file]
set -euo pipefail

ENV="${1:-}"
ENV_FILE="${2:-/opt/elykia/${ENV:-}/.env}"

if [[ -z "$ENV" || ( "$ENV" != "test" && "$ENV" != "prod" ) ]]; then
  echo "Usage: $0 <test|prod> [env_file]" >&2
  exit 2
fi

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi

APP_UID="${BACKEND_APP_UID:-999}"
APP_GID="${BACKEND_APP_GID:-999}"
LOG_DIR="${LOG_PATH:-/opt/elykia/$ENV/logs}"
PHOTO_DIR="${PHOTO_FALLBACK_PATH_HOST:-/opt/elykia/$ENV/photos/pending}"

mkdir -p "$LOG_DIR" "$PHOTO_DIR"
echo "Fixing backend bind-mount ownership: $LOG_DIR $PHOTO_DIR -> ${APP_UID}:${APP_GID}"
chown -R "$APP_UID:$APP_GID" "$LOG_DIR" "$PHOTO_DIR"
chmod -R u+rwX "$LOG_DIR" "$PHOTO_DIR"
