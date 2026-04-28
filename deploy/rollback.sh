#!/usr/bin/env bash
set -euo pipefail

# Usage:
# rollback.sh <env> [release_file|--last]
# Examples:
# rollback.sh prod --last
# rollback.sh prod releases/prod_20260427T120000Z.txt

ENV="$1"
TARGET="$2"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
RELEASES_DIR="$ROOT_DIR/releases"

if [ "$TARGET" = "--last" ]; then
  # pick previous entry (the one before current)
  CURRENT_LINK="$RELEASES_DIR/${ENV}_current.txt"
  if [ ! -L "$CURRENT_LINK" ]; then
    echo "No current release pointer found: $CURRENT_LINK" >&2
    exit 1
  fi
  CURRENT_FILE=$(readlink -f "$CURRENT_LINK")
  PREV_FILE=$(ls -1t "$RELEASES_DIR"/${ENV}_*.txt | sed -n '2p' || true)
  if [ -z "$PREV_FILE" ]; then
    echo "No previous release to rollback to" >&2
    exit 1
  fi
  TARGET="$PREV_FILE"
fi

if [ ! -f "$TARGET" ]; then
  echo "Specified release file not found: $TARGET" >&2
  exit 1
fi

echo "Rolling back $ENV to release file $TARGET"

FRONTEND_IMAGE=$(grep '^FRONTEND_IMAGE=' "$TARGET" | cut -d= -f2-)
BACKEND_IMAGE=$(grep '^BACKEND_IMAGE=' "$TARGET" | cut -d= -f2-)

echo "Selected FRONTEND_IMAGE=$FRONTEND_IMAGE"
echo "Selected BACKEND_IMAGE=$BACKEND_IMAGE"

COMPOSE_FILE="$ROOT_DIR/docker-compose.$ENV.yml"

cat > "$ROOT_DIR/.env" <<EOF
FRONTEND_IMAGE=$FRONTEND_IMAGE
BACKEND_IMAGE=$BACKEND_IMAGE
EOF

echo "Pulling images..."
docker compose -f "$COMPOSE_FILE" pull
echo "Applying rollback: bringing services up with selected images"
docker compose -f "$COMPOSE_FILE" up -d

ln -sfn "$TARGET" "$RELEASES_DIR/${ENV}_current.txt"

echo "Rollback completed"

