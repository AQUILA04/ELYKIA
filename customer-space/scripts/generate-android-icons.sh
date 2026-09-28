#!/usr/bin/env bash
# Régénère customer-space/resources/android-icons/ depuis resources/icon.png (ffmpeg local).
# Non utilisé en CI — le pack pré-généré est committé et copié par apply-customer-space-android-icons.sh.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$ROOT/resources/icon.png}"
OUT="$ROOT/resources/android-icons"

if [ ! -f "$SRC" ]; then
  echo "Icon source missing: $SRC" >&2
  exit 1
fi
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required to regenerate Android icons locally" >&2
  exit 1
fi

rm -rf "$OUT"
for spec in 'mdpi:48:108' 'hdpi:72:162' 'xhdpi:96:216' 'xxhdpi:144:324' 'xxxhdpi:192:432'; do
  IFS=':' read -r density launcher foreground <<< "$spec"
  dir="${OUT}/mipmap-${density}"
  mkdir -p "$dir"
  ffmpeg -nostdin -y -loglevel error -i "$SRC" \
    -vf "scale=${launcher}:${launcher}:flags=lanczos" "${dir}/ic_launcher.png"
  ffmpeg -nostdin -y -loglevel error -i "$SRC" \
    -vf "scale=${launcher}:${launcher}:flags=lanczos" "${dir}/ic_launcher_round.png"
  ffmpeg -nostdin -y -loglevel error -i "$SRC" \
    -vf "scale=${foreground}:${foreground}:flags=lanczos" "${dir}/ic_launcher_foreground.png"
done

echo "Regenerated Android icon pack → ${OUT}"
