#!/usr/bin/env bash
# =============================================================================
# setup-rclone.sh — Install rclone and deploy Google Drive configuration
# =============================================================================
# Run once during server setup. Writes rclone.conf for the deploy user from
# the RCLONE_CONF environment variable (or --rclone-conf-file).
#
# Usage:
#   sudo RCLONE_CONF="$(cat rclone.conf)" ./setup-rclone.sh
#   sudo ./setup-rclone.sh --rclone-conf-file /path/to/rclone.conf
# =============================================================================
set -euo pipefail

RCLONE_USER="${RCLONE_USER:-deploy}"
RCLONE_CONF_DIR="/home/$RCLONE_USER/.config/rclone"
RCLONE_CONF_FILE="$RCLONE_CONF_DIR/rclone.conf"
RCLONE_CONF_FILE_ARG=""

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --rclone-conf-file) RCLONE_CONF_FILE_ARG="$2"; shift ;;
    --user) RCLONE_USER="$2"; RCLONE_CONF_DIR="/home/$RCLONE_USER/.config/rclone"; RCLONE_CONF_FILE="$RCLONE_CONF_DIR/rclone.conf"; shift ;;
    *) echo "Unknown parameter: $1" >&2; exit 1 ;;
  esac
  shift
done

if [[ -n "$RCLONE_CONF_FILE_ARG" ]]; then
  if [[ ! -f "$RCLONE_CONF_FILE_ARG" ]]; then
    echo "Error: rclone config file not found: $RCLONE_CONF_FILE_ARG" >&2
    exit 1
  fi
  RCLONE_CONF="$(cat "$RCLONE_CONF_FILE_ARG")"
fi

if [[ -z "${RCLONE_CONF:-}" ]]; then
  echo "Error: RCLONE_CONF is not set and no --rclone-conf-file was provided." >&2
  echo "Usage: sudo RCLONE_CONF=\"\$(cat rclone.conf)\" $0" >&2
  exit 1
fi

if ! id "$RCLONE_USER" &>/dev/null; then
  echo "Error: user '$RCLONE_USER' does not exist." >&2
  exit 1
fi

echo "=== Setting up rclone for user: $RCLONE_USER ==="

if ! command -v rclone &>/dev/null; then
  echo "Installing rclone..."
  curl -fsSL https://rclone.org/install.sh | bash
else
  echo "rclone is already installed: $(rclone version | head -1)"
fi

mkdir -p "$RCLONE_CONF_DIR"
printf '%s\n' "$RCLONE_CONF" > "$RCLONE_CONF_FILE"
chmod 600 "$RCLONE_CONF_FILE"
chown -R "$RCLONE_USER:$RCLONE_USER" "/home/$RCLONE_USER/.config"

echo "rclone config written to $RCLONE_CONF_FILE"

REMOTE="${RCLONE_REMOTE:-gdrive}"
REMOTE_PATH="${RCLONE_REMOTE_PATH:-ELYKIA/backup}"

echo "Ensuring remote folder exists: $REMOTE:$REMOTE_PATH"
sudo -u "$RCLONE_USER" rclone mkdir "$REMOTE:$REMOTE_PATH" --config "$RCLONE_CONF_FILE" 2>/dev/null || true

echo "Verifying Google Drive connection..."
if sudo -u "$RCLONE_USER" rclone lsd "$REMOTE:" --config "$RCLONE_CONF_FILE" >/dev/null 2>&1; then
  echo "Google Drive connection OK."
else
  echo "Warning: could not list remote '$REMOTE'. Check rclone.conf and OAuth token." >&2
fi

echo "=== rclone setup complete ==="
