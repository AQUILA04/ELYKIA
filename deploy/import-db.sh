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

# Before importing, create a backup of the current DB state
echo "Creating pre-import backup..."
"$ROOT_DIR/db_backup.sh" "$ENV"


# find db container id
DB_CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q db)
if [ -z "$DB_CONTAINER" ]; then
  echo "DB container not running. Starting db service..."
  docker compose -f "$COMPOSE_FILE" up -d db
  sleep 3
  DB_CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q db)
fi

if [ -z "$DB_CONTAINER" ]; then
  echo "Cannot find DB container for compose file $COMPOSE_FILE" >&2
  exit 1
fi

# Helper: copy file into container and return container path
copy_into_container() {
  local src="$1"
  local dest="/tmp/$(basename "$1")"
  echo "Copying $src -> $DB_CONTAINER:$dest"
  docker cp "$src" "$DB_CONTAINER":"$dest"
  echo "$dest"
}

case "$DUMP_PATH" in
  *.sql)
    echo "Detected plain SQL"
    docker exec -i "$DB_CONTAINER" psql -U "$POSTGRES_USER" "$POSTGRES_DB" < "$DUMP_PATH"
    ;;
  *.sql.gz)
    echo "Detected gzipped SQL"
    gunzip -c "$DUMP_PATH" | docker exec -i "$DB_CONTAINER" psql -U "$POSTGRES_USER" "$POSTGRES_DB"
    ;;
  *.dump|*.pgdump|*.custom)
    echo "Detected pg_dump custom format"
    DEST=$(copy_into_container "$DUMP_PATH")
    docker exec -i "$DB_CONTAINER" pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists "$DEST"
    docker exec -i "$DB_CONTAINER" rm -f "$DEST" || true
    ;;
  *.dump.gz|*.pgdump.gz|*.custom.gz)
    echo "Detected gzipped pg_dump custom format"
    DEST_GZ=$(copy_into_container "$DUMP_PATH")
    # gunzip inside container to /tmp/<name>
    DEST=${DEST_GZ%.gz}
    docker exec -i "$DB_CONTAINER" sh -c "gunzip -c '$DEST_GZ' > '$DEST' && pg_restore -U '$POSTGRES_USER' -d '$POSTGRES_DB' --clean --if-exists '$DEST' && rm -f '$DEST' '$DEST_GZ'"
    ;;
  *)
    echo "Unknown dump format for file $DUMP_PATH. Supported: .sql, .sql.gz, .dump (custom), .dump.gz" >&2
    exit 2
    ;;
esac

echo "Import finished"

