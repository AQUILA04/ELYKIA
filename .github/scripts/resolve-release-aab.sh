#!/usr/bin/env bash
# Resolve release AAB path (signed or unsigned) and optionally rename it.
set -euo pipefail

AAB_DIR="${1:?release aab directory required}"
DEST_NAME="${2:-}"

if [[ ! -d "$AAB_DIR" ]]; then
  echo "Release AAB directory not found: $AAB_DIR" >&2
  echo "Available AAB outputs:" >&2
  find "$(dirname "$AAB_DIR")/.." -name '*.aab' -type f 2>/dev/null || true
  exit 1
fi

AAB_SRC=""
for candidate in \
  "$AAB_DIR/app-release.aab" \
  "$AAB_DIR/app-release-unsigned.aab"; do
  if [[ -f "$candidate" ]]; then
    AAB_SRC="$candidate"
    break
  fi
done

if [[ -z "$AAB_SRC" ]]; then
  mapfile -t found < <(find "$AAB_DIR" -type f -name '*.aab' | sort)
  if ((${#found[@]} > 0)); then
    AAB_SRC="${found[0]}"
  fi
fi

if [[ -z "$AAB_SRC" || ! -f "$AAB_SRC" ]]; then
  echo "No AAB found in $AAB_DIR" >&2
  ls -la "$AAB_DIR" 2>/dev/null || true
  exit 1
fi

echo "Found AAB: $AAB_SRC"

if [[ -n "$DEST_NAME" ]]; then
  AAB_DEST="$AAB_DIR/$DEST_NAME"
  mv "$AAB_SRC" "$AAB_DEST"
  echo "Renamed to: $AAB_DEST"
  echo "AAB_PATH=$AAB_DEST"
else
  echo "AAB_PATH=$AAB_SRC"
fi
