#!/usr/bin/env bash
set -euo pipefail

# Disaster recovery: download the latest prod DB backup from Google Drive and restore it.
#
# Usage: db_restore_from_drive.sh [env] [target-container]
#   env              test|prod (default: prod). Only prod backups are on Drive.
#   target-container optional DB container (e.g. elykia-prod-db-1)
#
# Run manually after an incident. Delegates restore to import-db.sh (pre-import backup + confirmation).

ENV="${1:-prod}"
TARGET_CONTAINER="${2:-}"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Must match db_backup_upload.sh
RCLONE_CONFIG="${RCLONE_CONFIG:-/home/deploy/.config/rclone/rclone.conf}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive}"
RCLONE_REMOTE_PATH="${RCLONE_REMOTE_PATH:-ELYKIA/backup}"

DUMP_GLOB='elykia_db_backup_prod_*.dump.gz'
RESTORE_DIR="${RESTORE_DIR:-/var/backups/elykia/restore}"

if [[ "$ENV" != "prod" ]]; then
  echo "Error: only prod backups are replicated on Drive. Use: $0 prod [container]" >&2
  exit 1
fi

if ! command -v rclone &>/dev/null; then
  echo "rclone is not installed. Run setup-rclone.sh first." >&2
  exit 1
fi

if [[ ! -f "$RCLONE_CONFIG" ]]; then
  echo "rclone config not found: $RCLONE_CONFIG" >&2
  exit 1
fi

REMOTE_DEST="$RCLONE_REMOTE:$RCLONE_REMOTE_PATH/"

echo "Listing backups on $REMOTE_DEST ..."
mapfile -t REMOTE_LINES < <(
  rclone lsf "$REMOTE_DEST" --config "$RCLONE_CONFIG" \
    --files-only --include "$DUMP_GLOB" --format 'tp' 2>/dev/null || true
)

if [[ ${#REMOTE_LINES[@]} -eq 0 ]]; then
  echo "No backup matching $DUMP_GLOB found on Drive." >&2
  exit 1
fi

# rclone lsf default separator is ';' between time and path
LATEST_LINE=$(printf '%s\n' "${REMOTE_LINES[@]}" | sort -t';' -k1,1 | tail -1)
LATEST_MTIME="${LATEST_LINE%;*}"
LATEST_FILE="${LATEST_LINE#*;}"

if [[ -z "$LATEST_FILE" ]]; then
  echo "Could not parse latest backup from Drive listing." >&2
  exit 1
fi

echo "Latest backup on Drive:"
echo "  File: $LATEST_FILE"
echo "  Modified: $LATEST_MTIME"
echo "  Restore into env: $ENV"
if [[ -n "$TARGET_CONTAINER" ]]; then
  echo "  Target container: $TARGET_CONTAINER"
else
  echo "  Target container: (auto-detect via import-db.sh)"
fi
echo

confirm_restore() {
  if [[ "${NONINTERACTIVE:-}" = "1" ]]; then
    echo "NONINTERACTIVE=1 set, skipping confirmation" >&2
    return 0
  fi

  if [[ ! -t 0 ]]; then
    echo "No TTY for confirmation. Set NONINTERACTIVE=1 to proceed." >&2
    return 1
  fi

  read -r -p "Download this backup from Drive and restore into '$ENV'? [y/N] " ans
  case "$ans" in
    [yY]|[yY][eE][sS]) return 0 ;;
    *)
      echo "Restore cancelled." >&2
      return 1
      ;;
  esac
}

if ! confirm_restore; then
  exit 2
fi

mkdir -p "$RESTORE_DIR"
LOCAL_DUMP="$RESTORE_DIR/$LATEST_FILE"

echo "Downloading to $LOCAL_DUMP ..."
rclone copyto "${REMOTE_DEST}${LATEST_FILE}" "$LOCAL_DUMP" --config "$RCLONE_CONFIG"

if [[ ! -f "$LOCAL_DUMP" ]]; then
  echo "Download failed: $LOCAL_DUMP not found." >&2
  exit 1
fi

echo "Download complete ($(du -h "$LOCAL_DUMP" | cut -f1))."
echo "Starting database restore via import-db.sh ..."

if [[ -n "$TARGET_CONTAINER" ]]; then
  exec "$ROOT_DIR/import-db.sh" "$ENV" "$LOCAL_DUMP" "$TARGET_CONTAINER"
else
  exec "$ROOT_DIR/import-db.sh" "$ENV" "$LOCAL_DUMP"
fi
