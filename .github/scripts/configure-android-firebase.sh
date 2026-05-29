#!/usr/bin/env bash
# Idempotent Firebase Crashlytics wiring for Capacitor Android (no duplicate google-services plugin).
set -euo pipefail

ANDROID_DIR="${1:?android directory required}"
ROOT_BUILD_GRADLE="$ANDROID_DIR/build.gradle"
APP_BUILD_GRADLE="$ANDROID_DIR/app/build.gradle"

for file in "$ROOT_BUILD_GRADLE" "$APP_BUILD_GRADLE"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing $file — skip Firebase configuration"
    exit 0
  fi
done

python3 - "$ROOT_BUILD_GRADLE" "$APP_BUILD_GRADLE" <<'PY'
import sys
from pathlib import Path

root = Path(sys.argv[1])
app = Path(sys.argv[2])
root_text = root.read_text()
app_text = app.read_text()

crashlytics_classpath = "classpath 'com.google.firebase:firebase-crashlytics-gradle:2.9.9'"
if crashlytics_classpath not in root_text:
    root_text = root_text.replace(
        "dependencies {",
        "dependencies {\n        " + crashlytics_classpath,
        1,
    )

if "com.google.firebase.crashlytics" not in app_text:
    marker = "apply plugin: 'com.android.application'"
    if marker not in app_text:
        raise SystemExit("apply plugin: 'com.android.application' not found in app/build.gradle")
    app_text = app_text.replace(
        marker,
        marker + "\napply plugin: 'com.google.firebase.crashlytics'",
        1,
    )

firebase_deps = "\n".join([
    "    implementation platform('com.google.firebase:firebase-bom:32.7.0')",
    "    implementation 'com.google.firebase:firebase-crashlytics'",
    "    implementation 'com.google.firebase:firebase-analytics'",
])
if "firebase-crashlytics" not in app_text:
    app_text = app_text.replace(
        "dependencies {",
        "dependencies {\n" + firebase_deps,
        1,
    )

root.write_text(root_text)
app.write_text(app_text)
print("Configured Firebase Crashlytics in Gradle files")
PY
