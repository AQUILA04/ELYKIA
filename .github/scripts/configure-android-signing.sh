#!/usr/bin/env bash
# Wire key.properties into Capacitor's app/build.gradle for signed release APKs.
set -euo pipefail

ANDROID_DIR="${1:?android directory required}"
APP_BUILD_GRADLE="$ANDROID_DIR/app/build.gradle"
KEY_PROPS="$ANDROID_DIR/key.properties"
KEYSTORE="$ANDROID_DIR/keystore.jks"

if [[ ! -f "$APP_BUILD_GRADLE" ]]; then
  echo "Missing $APP_BUILD_GRADLE — skip signing configuration"
  exit 0
fi

if [[ ! -f "$KEY_PROPS" ]] || [[ ! -f "$KEYSTORE" ]]; then
  echo "No keystore/key.properties — release APK will be unsigned"
  exit 0
fi

if grep -q 'signingConfigs' "$APP_BUILD_GRADLE"; then
  echo "Release signing already configured"
  exit 0
fi

python3 - "$APP_BUILD_GRADLE" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()

if "signingConfigs" in text:
    sys.exit(0)

insert = """
    def keystorePropertiesFile = rootProject.file("key.properties")
    def keystoreProperties = new Properties()
    if (keystorePropertiesFile.exists()) {
        keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
    }

    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
"""

if "android {" not in text:
    raise SystemExit("android { block not found in app/build.gradle")

text = text.replace("android {", "android {" + insert, 1)

release_marker = "        release {"
if release_marker in text and "signingConfig signingConfigs.release" not in text:
    text = text.replace(
        release_marker,
        release_marker + "\n            signingConfig signingConfigs.release",
        1,
    )

path.write_text(text)
print("Configured release signing in", path)
PY
