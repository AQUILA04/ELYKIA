#!/usr/bin/env bash
set -euo pipefail

# Usage:
# rollback.sh <env> [release_file|--last]
# Examples:
# rollback.sh prod --last
# rollback.sh prod /opt/elykia/prod/releases/prod_20260427T120000Z.txt

ENV="$1"
TARGET="$2"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.$ENV.yml"

# Align with deploy.sh: releases and .env live under /opt/elykia/<env>/
STACK_DIR="/opt/elykia/$ENV"
ENV_FILE="$STACK_DIR/.env"
RELEASES_DIR="$STACK_DIR/releases"

if [ ! -d "$RELEASES_DIR" ]; then
  echo "Releases directory not found: $RELEASES_DIR" >&2
  echo "Expected release metadata from deploy.sh (not under deploy/releases/)." >&2
  exit 1
fi

list_release_files_chronological() {
  # deploy.sh names files ${ENV}_YYYYMMDDTHHMMSSZ.txt — lexicographic sort = deploy order.
  ls -1 "$RELEASES_DIR"/${ENV}_2*.txt 2>/dev/null | sort || true
}

resolve_previous_release() {
  local current_link="$1"
  local current_file
  current_file=$(readlink -f "$current_link" 2>/dev/null || true)
  if [[ -z "$current_file" || ! -f "$current_file" ]]; then
    echo "Current release pointer is invalid: $current_link" >&2
    return 1
  fi

  local prev=""
  local release
  while IFS= read -r release; do
    [[ -z "$release" ]] && continue
    if [[ "$release" == "$current_file" ]]; then
      if [[ -n "$prev" ]]; then
        echo "$prev"
        return 0
      fi
      return 1
    fi
    prev="$release"
  done < <(list_release_files_chronological)

  echo "Current release not found in release history: $current_file" >&2
  return 1
}

if [ "$TARGET" = "--last" ]; then
  CURRENT_LINK="$RELEASES_DIR/${ENV}_current.txt"
  if [ ! -e "$CURRENT_LINK" ]; then
    echo "No current release pointer found: $CURRENT_LINK" >&2
    echo "List available releases: ls -lt $RELEASES_DIR" >&2
    exit 1
  fi
  if ! PREV_FILE=$(resolve_previous_release "$CURRENT_LINK"); then
    echo "No previous release to rollback to in $RELEASES_DIR" >&2
    exit 1
  fi
  TARGET="$PREV_FILE"
fi

if [ ! -f "$TARGET" ]; then
  echo "Specified release file not found: $TARGET" >&2
  exit 1
fi

echo "Rolling back $ENV to release file $TARGET"

FRONTEND_IMAGE=$(grep '^FRONTEND_IMAGE=' "$TARGET" | cut -d= -f2- || true)
BACKEND_IMAGE=$(grep '^BACKEND_IMAGE=' "$TARGET" | cut -d= -f2- || true)

if [[ -z "$FRONTEND_IMAGE" || -z "$BACKEND_IMAGE" ]]; then
  echo "Error: release file must contain FRONTEND_IMAGE and BACKEND_IMAGE" >&2
  exit 1
fi

echo "Selected FRONTEND_IMAGE=$FRONTEND_IMAGE"
echo "Selected BACKEND_IMAGE=$BACKEND_IMAGE"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found. Run setup-server.sh first." >&2
  exit 1
fi

set_env_var() {
  key="$1"
  val="$2"
  file="$ENV_FILE"
  if grep -q -E "^${key}=" "$file" 2>/dev/null; then
    tmp=$(mktemp)
    sed "s~^${key}=.*~${key}=${val}~" "$file" > "$tmp"
    cat "$tmp" > "$file"
    rm -f "$tmp"
  else
    echo "${key}=${val}" >> "$file"
  fi
}

set_env_var "FRONTEND_IMAGE" "$FRONTEND_IMAGE"
set_env_var "BACKEND_IMAGE" "$BACKEND_IMAGE"

echo "Using compose file: $COMPOSE_FILE"
echo "Using env file:     $ENV_FILE"

if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
  echo "Logging in to ghcr.io as $GHCR_USERNAME"
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
fi

echo "Pulling images..."
docker compose \
  -f "$COMPOSE_FILE" \
  --project-name "elykia-$ENV" \
  --env-file "$ENV_FILE" \
  pull

echo "Applying rollback: bringing services up with selected images"
docker compose \
  -f "$COMPOSE_FILE" \
  --project-name "elykia-$ENV" \
  --env-file "$ENV_FILE" \
  up -d

ln -sfn "$TARGET" "$RELEASES_DIR/${ENV}_current.txt"

echo "Rollback completed"
