#!/usr/bin/env bash
set -euo pipefail

# Usage:
# import-db.sh <env> <dump-path-on-server>
# Examples:
# 1) Copy a dump to the server: scp dump.sql.gz user@server:/tmp/dump.sql.gz
# 2) SSH and run: ./import-db.sh prod /tmp/dump.sql.gz

ENV="$1"
DUMP_PATH="$2"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.$ENV.yml"

# read DB credentials from .env or defaults
source "$ROOT_DIR/.env" || true
POSTGRES_USER=${POSTGRES_USER:-elykia}
POSTGRES_DB=${POSTGRES_DB:-elykia_db}

echo "Importing dump $DUMP_PATH into DB container for env $ENV"

# find db container id
DB_CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q db)
if [ -z "$DB_CONTAINER" ]; then
  echo "DB container not running. Starting db service..."
  docker compose -f "$COMPOSE_FILE" up -d db
  sleep 3
  DB_CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q db)
fi

if [[ "$DUMP_PATH" == *.gz ]]; then
  echo "Detected gzip compressed dump; using gunzip stream"
  cat "$DUMP_PATH" | docker exec -i "$DB_CONTAINER" sh -c "gunzip -c - | psql -U $POSTGRES_USER $POSTGRES_DB"
else
  docker exec -i "$DB_CONTAINER" psql -U "$POSTGRES_USER" "$POSTGRES_DB" < "$DUMP_PATH"
fi

echo "Import finished"

