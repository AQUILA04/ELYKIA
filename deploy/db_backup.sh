#!/usr/bin/env bash
set -euo pipefail

# Usage: db_backup.sh <env> [target-container]
# Creates a pg_dump (custom format) of the database for the given env and stores it on the host
# under BACKUP_ROOT/<YYYY-MM-DD>/ with filename <env>_YYYY-MM-DD_HHMMSS.dump

ENV="${1:?env required (test|prod)}"
TARGET_CONTAINER="${2:-}"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/stack.sh
source "$ROOT_DIR/lib/stack.sh"

STACK_DIR="$(elykia_stack_dir "$ENV")"
ENV_FILE="$(elykia_stack_env_file "$ENV")"

BACKUP_ROOT=${BACKUP_ROOT:-/var/backups/elykia}

elykia_load_stack_env "$ENV"

TIMESTAMP=$(date -u +"%Y-%m-%d_%H%M%SZ")
DATE_DIR=$(date -u +"%Y-%m-%d")
DEST_DIR="$BACKUP_ROOT/$DATE_DIR"
mkdir -p "$DEST_DIR"

DB_CONTAINER="$(elykia_resolve_db_container "$ROOT_DIR" "$ENV" "$TARGET_CONTAINER")" || {
  echo "Could not find db container for env $ENV" >&2
  exit 1
}

if ! docker inspect "$DB_CONTAINER" >/dev/null 2>&1; then
  echo "Container '$DB_CONTAINER' not found." >&2
  exit 1
fi

echo "Using DB container: $DB_CONTAINER" >&2
docker inspect --format 'Container name: {{.Name}}' "$DB_CONTAINER" 2>/dev/null | sed 's/^/ /' >&2 || true

elykia_sync_pg_creds_from_container "$DB_CONTAINER"
PG_DUMP_USER="$(elykia_resolve_pg_dump_user "$DB_CONTAINER" "$POSTGRES_USER")"

echo "Using POSTGRES_USER=$POSTGRES_USER POSTGRES_DB=$POSTGRES_DB (pg_dump as $PG_DUMP_USER)" >&2

CONTAINER_TMP="/tmp/elykia_db_backup_${ENV}_${TIMESTAMP}.dump"

echo "Creating dump inside container"
docker exec -i "$DB_CONTAINER" pg_dump -U "$PG_DUMP_USER" -Fc -d "$POSTGRES_DB" -f "$CONTAINER_TMP"

echo "Copying dump to host: $DEST_DIR/"
docker cp "$DB_CONTAINER":"$CONTAINER_TMP" "$DEST_DIR/"
docker exec -i "$DB_CONTAINER" rm -f "$CONTAINER_TMP" || true

BACKUP_PATH="$DEST_DIR/$(basename "$CONTAINER_TMP")"
echo "Backup created: $BACKUP_PATH"

echo "Cleaning up old weekly backup folders (keep current and previous week)"
CURRENT_ISO_YEAR=$(date -u +%G)
CURRENT_ISO_WEEK=$(date -u +%V)

for d in $(find "$BACKUP_ROOT" -maxdepth 1 -mindepth 1 -type d -printf "%f\n" 2>/dev/null || true); do
  if [[ ! "$d" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    continue
  fi
  year_week=$(date -d "$d" +%G-%V 2>/dev/null || true)
  if [ -z "$year_week" ]; then
    continue
  fi
  yw_year=${year_week%-*}
  yw_week=${year_week#*-}

  if [ "$yw_year" -lt "$CURRENT_ISO_YEAR" ]; then
    echo "Removing old backup dir: $d (year $yw_year < $CURRENT_ISO_YEAR)"
    rm -rf "$BACKUP_ROOT/$d"
    continue
  fi

  week_diff=$((10#$CURRENT_ISO_WEEK - 10#$yw_week))
  if [ "$week_diff" -gt 1 ]; then
    echo "Removing backup dir older than previous week: $d (week $yw_week)"
    rm -rf "$BACKUP_ROOT/$d"
  fi
done

echo "Backup and cleanup completed."
