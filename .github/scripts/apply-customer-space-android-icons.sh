#!/usr/bin/env bash
# Remplace les icônes launcher Android Capacitor par le pack ELYKIA pré-généré
# (customer-space/resources/android-icons/). Aucune dépendance ffmpeg en CI.
# Usage: apply-customer-space-android-icons.sh <android-dir> [icons-pack-dir]
set -euo pipefail

ANDROID_DIR="${1:?android directory required}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PACK="${2:-$ROOT/customer-space/resources/android-icons}"
RES="$ANDROID_DIR/app/src/main/res"

if [ ! -d "$PACK" ]; then
  echo "Icon pack missing: $PACK" >&2
  exit 1
fi
if [ ! -d "$RES" ]; then
  echo "Android res directory missing: $RES" >&2
  exit 1
fi

for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  src_dir="${PACK}/mipmap-${density}"
  dest_dir="${RES}/mipmap-${density}"
  if [ ! -d "$src_dir" ]; then
    echo "Missing density pack: $src_dir" >&2
    exit 1
  fi
  for name in ic_launcher.png ic_launcher_round.png ic_launcher_foreground.png; do
    if [ ! -f "${src_dir}/${name}" ]; then
      echo "Missing icon file: ${src_dir}/${name}" >&2
      exit 1
    fi
  done
  mkdir -p "$dest_dir"
  cp "${src_dir}/ic_launcher.png" "${dest_dir}/ic_launcher.png"
  cp "${src_dir}/ic_launcher_round.png" "${dest_dir}/ic_launcher_round.png"
  cp "${src_dir}/ic_launcher_foreground.png" "${dest_dir}/ic_launcher_foreground.png"
done

# Fond adaptatif navy (aligné --elyk-navy)
mkdir -p "${RES}/values"
cat > "${RES}/values/ic_launcher_background.xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0D1B2A</color>
</resources>
EOF

# Adaptive icons → mipmaps PNG
mkdir -p "${RES}/mipmap-anydpi-v26"
cat > "${RES}/mipmap-anydpi-v26/ic_launcher.xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
EOF
cp "${RES}/mipmap-anydpi-v26/ic_launcher.xml" "${RES}/mipmap-anydpi-v26/ic_launcher_round.xml"

echo "Applied ELYKIA launcher icons from ${PACK} → ${RES}"
