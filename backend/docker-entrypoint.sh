#!/bin/sh
# Start as root, fix bind-mount ownership, then drop to user app.
# Host log/photo dirs often keep a previous image UID (Alpine app=100 vs Debian app=999).
# Logback then fails with Permission denied and the container crash-loops.
set -eu

APP_USER="${APP_USER:-app}"

fix_dir() {
  dir="$1"
  if [ -d "$dir" ]; then
    chown -R "${APP_USER}:${APP_USER}" "$dir" || true
  fi
}

if [ "$(id -u)" = "0" ]; then
  fix_dir /home/app/.optimize-elykia-core/logs
  fix_dir /home/app/.optimize-elykia-core/operations
  fix_dir /opt/elykia/photos/pending

  if command -v runuser >/dev/null 2>&1; then
    exec runuser -u "$APP_USER" -- "$@"
  fi
  exec setpriv --reuid="$APP_USER" --regid="$APP_USER" --init-groups -- "$@"
fi

exec "$@"
