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

if grep -q 'signingConfig signingConfigs.release' "$APP_BUILD_GRADLE"; then
  echo "Release signing already configured"
  exit 0
fi

python3 - "$APP_BUILD_GRADLE" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()

if "signingConfig signingConfigs.release" in text:
    sys.exit(0)

if "android {" not in text:
    raise SystemExit("android { block not found in app/build.gradle")

# Load key.properties at file scope (before android {}) so signingConfigs can reference it.
keystore_loader = """
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

"""

signing_configs = """
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
"""

if "keystorePropertiesFile" not in text:
    text = text.replace("android {", keystore_loader + "android {", 1)

if "signingConfigs {" not in text:
    text = text.replace("android {", "android {" + signing_configs, 1)

text, count = re.subn(
    r"(buildTypes\s*\{\s*release\s*\{)",
    r"\1\n            signingConfig signingConfigs.release",
    text,
    count=1,
)

if count == 0:
    raise SystemExit("buildTypes.release block not found in app/build.gradle")

path.write_text(text)
print("Configured release signing in", path)
PY
