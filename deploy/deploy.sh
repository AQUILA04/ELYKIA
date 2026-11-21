#!/usr/bin/env bash
set -euo pipefail

# Usage:
# deploy.sh <env> [frontend_image] [backend_image]
# env = test|prod
# Exemple: ./deploy.sh test ghcr.io/OWNER/ELYKIA-frontend:1.2.3 ghcr.io/OWNER/ELYKIA-backend:1.2.3
# Vous pouvez aussi omettre les images si elles sont définies dans deploy/.env

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 [--force-update | -fu] <env> [frontend_image] [backend_image]" >&2
  exit 2
fi

if [[ "$1" == "--force-update" || "$1" == "-fu" ]]; then
    echo "Force update requested. Updating deploy scripts..."
    curl -sSL https://raw.githubusercontent.com/AQUILA04/ELYKIA/main/deploy/update-deploy.sh | bash
    shift
    if [ "$#" -lt 1 ]; then
      echo "Error: Missing environment argument after force-update." >&2
      echo "Usage: $0 [--force-update | -fu] <env> [frontend_image] [backend_image]" >&2
      exit 2
    fi
    echo "Re-executing updated deploy.sh..."
    exec /opt/elykia/deploy/deploy.sh "$@"
fi

ENV="$1"
FRONTEND_ARG="${2:-}"
BACKEND_ARG="${3:-}"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.$ENV.yml"

# Each stack has its own directory and .env under /opt/elykia/<env>/
# This keeps test and prod secrets fully isolated from each other.
STACK_DIR="/opt/elykia/$ENV"
ENV_FILE="$STACK_DIR/.env"
RELEASES_DIR="$STACK_DIR/releases"
mkdir -p "$RELEASES_DIR"

# Load stack-specific .env if present (do not fail if absent)
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
else
  echo "Warning: $ENV_FILE not found. Run setup-server.sh first." >&2
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
# Cron DB backups run as user deploy and source this file: keep it group-readable.
if getent group deploy &>/dev/null; then
  chgrp deploy "$ENV_FILE" 2>/dev/null || true
  chmod 640 "$ENV_FILE" || true
else
  chmod 600 "$ENV_FILE" || true
fi
mkdir -p "$(dirname "$ENV_FILE")"

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

# Customer-space web (clients[-test].amenouveve-yaveh.com) calls the API cross-origin.
# Existing .env files pin SECURITY_ALLOWED_ORIGINS, so the compose default alone is not enough.
if [[ "$ENV" == "prod" ]]; then
  DEFAULT_CUSTOMER_SPACE_HOSTNAME="clients.amenouveve-yaveh.com"
else
  DEFAULT_CUSTOMER_SPACE_HOSTNAME="clients-test.amenouveve-yaveh.com"
fi
CUSTOMER_SPACE_ORIGIN="https://${CUSTOMER_SPACE_HOSTNAME:-$DEFAULT_CUSTOMER_SPACE_HOSTNAME}"
if [[ -n "${SECURITY_ALLOWED_ORIGINS:-}" && ",${SECURITY_ALLOWED_ORIGINS}," != *",${CUSTOMER_SPACE_ORIGIN},"* ]]; then
  SECURITY_ALLOWED_ORIGINS="${SECURITY_ALLOWED_ORIGINS},${CUSTOMER_SPACE_ORIGIN}"
  export SECURITY_ALLOWED_ORIGINS
  set_env_var "SECURITY_ALLOWED_ORIGINS" "$SECURITY_ALLOWED_ORIGINS"
  echo "Added $CUSTOMER_SPACE_ORIGIN to SECURITY_ALLOWED_ORIGINS"
fi

CURRENT_LINK="$RELEASES_DIR/${ENV}_current.txt"
PREVIOUS_RELEASE_FILE=""
PREV_FRONTEND_IMAGE=""
PREV_BACKEND_IMAGE=""
if [[ -e "$CURRENT_LINK" ]]; then
  PREVIOUS_RELEASE_FILE=$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)
  if [[ -n "$PREVIOUS_RELEASE_FILE" && -f "$PREVIOUS_RELEASE_FILE" ]]; then
    PREV_FRONTEND_IMAGE=$(grep '^FRONTEND_IMAGE=' "$PREVIOUS_RELEASE_FILE" | cut -d= -f2- || true)
    PREV_BACKEND_IMAGE=$(grep '^BACKEND_IMAGE=' "$PREVIOUS_RELEASE_FILE" | cut -d= -f2- || true)
  else
    PREVIOUS_RELEASE_FILE=""
  fi
fi

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
RELEASE_FILE="$RELEASES_DIR/${ENV}_${TIMESTAMP}.txt"

echo "DEPLOY: env=$ENV"
echo "Using compose file: $COMPOSE_FILE"
echo "Using env file:     $ENV_FILE"
if [[ -n "$PREVIOUS_RELEASE_FILE" ]]; then
  echo "Previous release:   $PREVIOUS_RELEASE_FILE (backend=${PREV_BACKEND_IMAGE:-unknown})"
fi
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

docker compose \
  -f "$COMPOSE_FILE" \
  --project-name "elykia-$ENV" \
  --env-file "$ENV_FILE" \
  pull

# Host logs/photos must match image user app (UID 999). Alpine leftovers (100:101)
# crash-loop Logback after CD and Traefik then serves the SPA on /api.
FIX_MOUNTS="$ROOT_DIR/fix-backend-bind-mounts.sh"
if [[ -x "$FIX_MOUNTS" ]]; then
  "$FIX_MOUNTS" "$ENV" "$ENV_FILE"
elif [[ -f "$FIX_MOUNTS" ]]; then
  bash "$FIX_MOUNTS" "$ENV" "$ENV_FILE"
else
  echo "Warning: $FIX_MOUNTS not found; bind-mount UIDs may be stale." >&2
fi

probe_backend_health() {
  local cid="$1"
  local port="$2"
  local ip body=""

  # Primary: query container bridge IP directly from host (no curl/wget needed inside temurin:25-jre)
  ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' "$cid" 2>/dev/null | awk '{print $1}' || true)
  if [[ -n "$ip" ]] && command -v curl >/dev/null 2>&1; then
    body=$(curl -fsS --max-time 3 "http://${ip}:${port}/actuator/health" 2>/dev/null || true)
  fi

  # Fallback: pure bash /dev/tcp inside container
  if [[ -z "$body" ]]; then
    body=$(docker exec "$cid" bash -c "exec 3<>/dev/tcp/127.0.0.1/${port} && printf 'GET /actuator/health HTTP/1.0\r\nHost: localhost\r\nConnection: close\r\n\r\n' >&3 && cat <&3" 2>/dev/null || true)
  fi

  if echo "$body" | grep -Eq '"status"[[:space:]]*:[[:space:]]*"UP"'; then
    echo "$body"
    return 0
  fi
  return 1
}

wait_for_backend_health() {
  local initial_delay="${BACKEND_HEALTH_INITIAL_DELAY:-10}"
  local timeout="${BACKEND_HEALTH_TIMEOUT:-90}"
  local interval="${BACKEND_HEALTH_INTERVAL:-3}"
  local port="${SERVER_PORT:-8080}"
  local cid elapsed=0 status restarts health_body

  cid=$(docker compose \
    -f "$COMPOSE_FILE" \
    --project-name "elykia-$ENV" \
    --env-file "$ENV_FILE" \
    ps -q backend | head -n 1 || true)

  if [[ -z "$cid" ]]; then
    echo "ERROR: backend container not found for project elykia-$ENV" >&2
    return 1
  fi

  echo "Waiting ${initial_delay}s before polling backend /actuator/health (container=${cid:0:12}, port=${port}, timeout=${timeout}s)..."
  sleep "$initial_delay"
  elapsed="$initial_delay"

  while (( elapsed <= timeout )); do
    status=$(docker inspect -f '{{.State.Status}}' "$cid" 2>/dev/null || echo "unknown")
    restarts=$(docker inspect -f '{{.RestartCount}}' "$cid" 2>/dev/null || echo "0")

    if [[ "$status" == "exited" || "$status" == "dead" ]]; then
      echo "ERROR: backend container stopped unexpectedly (status=${status}, restarts=${restarts})." >&2
      return 1
    fi
    if (( restarts >= 3 )); then
      echo "ERROR: backend container is crash-looping (restarts=${restarts})." >&2
      return 1
    fi

    if health_body=$(probe_backend_health "$cid" "$port"); then
      echo "Backend health check PASSED after ${elapsed}s: $(echo "$health_body" | tr -d '\r\n' | tail -c 200)"
      return 0
    fi

    echo "Backend not UP yet (${elapsed}s/${timeout}s, status=${status}, restarts=${restarts})..."
    sleep "$interval"
    elapsed=$((elapsed + interval))
  done

  echo "ERROR: backend failed to report status=UP within ${timeout}s." >&2
  return 1
}

echo "Starting services..."
docker compose \
  -f "$COMPOSE_FILE" \
  --project-name "elykia-$ENV" \
  --env-file "$ENV_FILE" \
  up -d

if ! wait_for_backend_health; then
  echo "============================================================" >&2
  echo "DEPLOYMENT HEALTH CHECK FAILED (env=$ENV) — DUMPING LOGS" >&2
  echo "============================================================" >&2
  docker compose \
    -f "$COMPOSE_FILE" \
    --project-name "elykia-$ENV" \
    --env-file "$ENV_FILE" \
    logs --tail=80 backend >&2 || true

  mv -f "$RELEASE_FILE" "${RELEASE_FILE}.failed" 2>/dev/null || true

  if [[ -n "$PREVIOUS_RELEASE_FILE" && -f "$PREVIOUS_RELEASE_FILE" ]] \
     && [[ "$PREV_BACKEND_IMAGE" != "$BACKEND_IMAGE" || "$PREV_FRONTEND_IMAGE" != "$FRONTEND_IMAGE" ]]; then
    echo "============================================================" >&2
    echo "TRIGGERING AUTOMATIC ROLLBACK to $PREVIOUS_RELEASE_FILE" >&2
    echo "============================================================" >&2
    if bash "$ROOT_DIR/rollback.sh" "$ENV" "$PREVIOUS_RELEASE_FILE"; then
      if wait_for_backend_health; then
        echo "Automatic rollback succeeded and previous backend is UP." >&2
      else
        echo "WARNING: rollback completed but previous backend health check did not return UP." >&2
      fi
    else
      echo "CRITICAL: automatic rollback script failed!" >&2
    fi
  else
    echo "No distinct previous release available for automatic rollback." >&2
  fi
  exit 1
fi

echo "Deployment finished. Latest release metadata:"
tail -n +1 "$RELEASE_FILE"

echo "Touching current pointer"
ln -sfn "$RELEASE_FILE" "$CURRENT_LINK"

echo "Done"


