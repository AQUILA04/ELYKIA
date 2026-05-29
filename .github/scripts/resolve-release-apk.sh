#!/usr/bin/env bash
# Resolve release APK path (signed or unsigned) and optionally rename it.
set -euo pipefail

APK_DIR="${1:?release apk directory required}"
DEST_NAME="${2:-}"

if [[ ! -d "$APK_DIR" ]]; then
  echo "Release APK directory not found: $APK_DIR" >&2
  echo "Available APK outputs:" >&2
  find "$(dirname "$APK_DIR")/.." -name '*.apk' -type f 2>/dev/null || true
  exit 1
fi

APK_SRC=""
for candidate in \
  "$APK_DIR/app-release.apk" \
  "$APK_DIR/app-release-unsigned.apk"; do
  if [[ -f "$candidate" ]]; then
    APK_SRC="$candidate"
    break
  fi
done

if [[ -z "$APK_SRC" ]]; then
  mapfile -t found < <(find "$APK_DIR" -type f -name '*.apk' | sort)
  if ((${#found[@]} > 0)); then
    APK_SRC="${found[0]}"
  fi
fi

if [[ -z "$APK_SRC" || ! -f "$APK_SRC" ]]; then
  echo "No APK found in $APK_DIR" >&2
  ls -la "$APK_DIR" 2>/dev/null || true
  exit 1
fi

echo "Found APK: $APK_SRC"

if [[ -n "$DEST_NAME" ]]; then
  APK_DEST="$APK_DIR/$DEST_NAME"
  mv "$APK_SRC" "$APK_DEST"
  echo "Renamed to: $APK_DEST"
  echo "APK_PATH=$APK_DEST"
else
  echo "APK_PATH=$APK_SRC"
fi
