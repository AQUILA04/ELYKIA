#!/usr/bin/env bash
# Set versionName / versionCode in app/build.gradle from mobile/package.json.
set -euo pipefail

ANDROID_DIR="${1:?android directory required}"
PACKAGE_JSON="${2:-$(cd "$ANDROID_DIR/.." && pwd)/package.json}"
APP_BUILD_GRADLE="$ANDROID_DIR/app/build.gradle"

if [[ ! -f "$APP_BUILD_GRADLE" ]]; then
  echo "Missing $APP_BUILD_GRADLE — skip Android version sync"
  exit 0
fi

if [[ ! -f "$PACKAGE_JSON" ]]; then
  echo "Missing $PACKAGE_JSON — skip Android version sync"
  exit 0
fi

python3 - "$PACKAGE_JSON" "$APP_BUILD_GRADLE" <<'PY'
import json
import re
import sys
from pathlib import Path

package_json = Path(sys.argv[1])
gradle_path = Path(sys.argv[2])

version = json.loads(package_json.read_text())["version"]
# Strip non-numeric suffixes (e.g. "2.8.5.M1")
version = version.split(".M")[0]
parts = version.split(".")
if len(parts) != 3 or not all(p.isdigit() for p in parts):
    raise SystemExit(f"Invalid semver in package.json: {version!r}")

major, minor, patch = (int(p) for p in parts)
version_code = major * 10000 + minor * 100 + patch
version_name = f"{major}.{minor}.{patch}"

text = gradle_path.read_text()

if "versionName" not in text or "versionCode" not in text:
    raise SystemExit("versionName or versionCode not found in app/build.gradle")

text, name_count = re.subn(
    r'versionName\s+["\'][^"\']*["\']',
    f'versionName "{version_name}"',
    text,
    count=1,
)
text, code_count = re.subn(
    r"versionCode\s+\d+",
    f"versionCode {version_code}",
    text,
    count=1,
)

if name_count != 1 or code_count != 1:
    raise SystemExit("Failed to patch versionName or versionCode in app/build.gradle")

gradle_path.write_text(text)
print(f"Android version synced: versionName={version_name}, versionCode={version_code}")
PY
