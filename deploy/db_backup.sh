#!/usr/bin/env bash
set -euo pipefail

# Usage: db_backup.sh <env>
# Creates a pg_dump (custom format) of the database for the given env and stores it on the host
# under BACKUP_ROOT/<YYYY-MM-DD>/ with filename <env>_YYYY-MM-DD_HHMMSS.dump

ENV="$1"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.$ENV.yml"

# Location on host where backups will be stored (change if desired)
BACKUP_ROOT=${BACKUP_ROOT:-/var/backups/elykia}

# read DB credentials from .env or defaults
source "$ROOT_DIR/.env" || true
POSTGRES_USER=${POSTGRES_USER:-elykia}
POSTGRES_DB=${POSTGRES_DB:-elykia_db}

TIMESTAMP=$(date -u +"%Y-%m-%d_%H%M%SZ")
DATE_DIR=$(date -u +"%Y-%m-%d")
DEST_DIR="$BACKUP_ROOT/$DATE_DIR"
mkdir -p "$DEST_DIR"

echo "Ensuring DB container is running for env $ENV"
DB_CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q db)
if [ -z "$DB_CONTAINER" ]; then
  docker compose -f "$COMPOSE_FILE" up -d db
  sleep 3
  DB_CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q db)
fi

if [ -z "$DB_CONTAINER" ]; then
  echo "Could not find db container for compose file $COMPOSE_FILE" >&2
  exit 1
fi

HOST_TMP=/tmp/elykia_db_backup_${ENV}_${TIMESTAMP}.dump
CONTAINER_TMP=/tmp/elykia_db_backup_${ENV}_${TIMESTAMP}.dump

echo "Creating dump inside container"
docker exec -i "$DB_CONTAINER" pg_dump -U "$POSTGRES_USER" -Fc -d "$POSTGRES_DB" -f "$CONTAINER_TMP"

echo "Copying dump to host: $DEST_DIR/"
docker cp "$DB_CONTAINER":"$CONTAINER_TMP" "$DEST_DIR/"
docker exec -i "$DB_CONTAINER" rm -f "$CONTAINER_TMP" || true

BACKUP_PATH="$DEST_DIR/$(basename "$CONTAINER_TMP")"
echo "Backup created: $BACKUP_PATH"

# Cleanup: remove older weekly folders (keep last two weeks)
echo "Cleaning up old weekly backup folders (keep current and previous week)"
CURRENT_ISO_YEAR=$(date -u +%G)
CURRENT_ISO_WEEK=$(date -u +%V)

for d in $(find "$BACKUP_ROOT" -maxdepth 1 -mindepth 1 -type d -printf "%f\n"); do
  # d is YYYY-MM-DD
  if [[ ! "$d" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    continue
  fi
  year_week=$(date -d "$d" +%G-%V 2>/dev/null || true)
  if [ -z "$year_week" ]; then
    continue
  fi
  yw_year=${year_week%-*}
  yw_week=${year_week#*-}

  # compute difference in weeks; handle year wrap
  if [ "$yw_year" -lt "$CURRENT_ISO_YEAR" ]; then
    # older year: decide if more than 1 week older
    echo "Removing old backup dir: $d (year $yw_year < $CURRENT_ISO_YEAR)"
    rm -rf "$BACKUP_ROOT/$d"
    continue
  fi

  # same year
  week_diff=$((10#$CURRENT_ISO_WEEK - 10#$yw_week))
  if [ "$week_diff" -gt 1 ]; then
    echo "Removing backup dir older than previous week: $d (week $yw_week)"
    rm -rf "$BACKUP_ROOT/$d"
  fi
done

echo "Backup and cleanup completed."

