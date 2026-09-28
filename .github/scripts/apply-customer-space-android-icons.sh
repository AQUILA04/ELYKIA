#!/usr/bin/env bash
# Remplace les icônes launcher Android Capacitor par le logo ELYKIA (resources/icon.png).
# Usage: apply-customer-space-android-icons.sh <android-dir> [icon-source.png]
set -euo pipefail

ANDROID_DIR="${1:?android directory required}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="${2:-$ROOT/customer-space/resources/icon.png}"
RES="$ANDROID_DIR/app/src/main/res"

if [ ! -f "$SRC" ]; then
  echo "Icon source missing: $SRC" >&2
  exit 1
fi
if [ ! -d "$RES" ]; then
  echo "Android res directory missing: $RES" >&2
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required to generate Android launcher icons" >&2
  exit 1
fi

scale_png() {
  local size="$1"
  local out="$2"
  # -nostdin: évite que ffmpeg consomme le stdin d'une boucle / pipeline
  ffmpeg -nostdin -y -loglevel error \
    -i "$SRC" \
    -vf "scale=${size}:${size}:flags=lanczos" \
    "$out"
}

# Densités Android (launcher / foreground adaptatif)
# mdpi 48/108 · hdpi 72/162 · xhdpi 96/216 · xxhdpi 144/324 · xxxhdpi 192/432
for spec in \
  'mdpi:48:108' \
  'hdpi:72:162' \
  'xhdpi:96:216' \
  'xxhdpi:144:324' \
  'xxxhdpi:192:432'
do
  IFS=':' read -r density launcher foreground <<< "$spec"
  dir="${RES}/mipmap-${density}"
  mkdir -p "$dir"
  scale_png "$launcher" "${dir}/ic_launcher.png"
  scale_png "$launcher" "${dir}/ic_launcher_round.png"
  scale_png "$foreground" "${dir}/ic_launcher_foreground.png"
done

# Fond adaptatif navy (aligné --elyk-navy)
mkdir -p "${RES}/values"
cat > "${RES}/values/ic_launcher_background.xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0D1B2A</color>
</resources>
EOF

# S'assurer que les adaptive-icons pointent bien vers les mipmaps PNG
mkdir -p "${RES}/mipmap-anydpi-v26"
cat > "${RES}/mipmap-anydpi-v26/ic_launcher.xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
EOF
cp "${RES}/mipmap-anydpi-v26/ic_launcher.xml" "${RES}/mipmap-anydpi-v26/ic_launcher_round.xml"

echo "Applied ELYKIA launcher icons from ${SRC} → ${RES}"
