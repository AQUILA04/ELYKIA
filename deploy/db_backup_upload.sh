#!/usr/bin/env bash
set -euo pipefail

# Uploads the latest prod database backup to Google Drive (gzipped).
# Intended to run after the evening db_backup.sh cron job.
#
# Remote destination: gdrive:ELYKIA/backup/
# Retention on Drive: 30 days (configurable via RCLONE_RETENTION_DAYS)

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/elykia}"
RCLONE_CONFIG="${RCLONE_CONFIG:-/home/deploy/.config/rclone/rclone.conf}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive}"
RCLONE_REMOTE_PATH="${RCLONE_REMOTE_PATH:-ELYKIA/backup}"
RCLONE_RETENTION_DAYS="${RCLONE_RETENTION_DAYS:-30}"

if ! command -v rclone &>/dev/null; then
  echo "rclone is not installed. Run setup-rclone.sh first." >&2
  exit 1
fi

if [[ ! -f "$RCLONE_CONFIG" ]]; then
  echo "rclone config not found: $RCLONE_CONFIG" >&2
  exit 1
fi

DATE_DIR=$(date -u +"%Y-%m-%d")
SEARCH_DIR="$BACKUP_ROOT/$DATE_DIR"

# Must match db_backup.sh: elykia_db_backup_<env>_<timestamp>.dump
DUMP_GLOB='elykia_db_backup_prod_*.dump'

find_latest_dump() {
  local dir="$1"
  find "$dir" -maxdepth 1 -type f -name "$DUMP_GLOB" -printf '%T@ %p\n' 2>/dev/null \
    | sort -n | tail -1 | cut -d' ' -f2- || true
}

LATEST_DUMP=""
if [[ -d "$SEARCH_DIR" ]]; then
  LATEST_DUMP="$(find_latest_dump "$SEARCH_DIR")"
fi

if [[ -z "$LATEST_DUMP" ]]; then
  LATEST_DUMP="$(find "$BACKUP_ROOT" -type f -name "$DUMP_GLOB" -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2- || true)"
fi

if [[ -z "$LATEST_DUMP" || ! -f "$LATEST_DUMP" ]]; then
  echo "No prod backup dump found under $BACKUP_ROOT" >&2
  exit 1
fi

echo "Using backup file: $LATEST_DUMP"

GZ_FILE="${LATEST_DUMP}.gz"
if [[ -f "$GZ_FILE" ]]; then
  echo "Compressed file already exists: $GZ_FILE"
else
  echo "Compressing backup with gzip..."
  gzip -k -f "$LATEST_DUMP"
fi

REMOTE_DEST="$RCLONE_REMOTE:$RCLONE_REMOTE_PATH/"
echo "Uploading to $REMOTE_DEST"
rclone copy "$GZ_FILE" "$REMOTE_DEST" --config "$RCLONE_CONFIG"

echo "Removing remote backups older than ${RCLONE_RETENTION_DAYS} days..."
rclone delete "$REMOTE_DEST" \
  --config "$RCLONE_CONFIG" \
  --min-age "${RCLONE_RETENTION_DAYS}d" \
  --include 'elykia_db_backup_prod_*.dump.gz'

echo "Upload and remote cleanup completed."
