#!/usr/bin/env bash
# Installe le plugin natif AppUpdate (APK install + SHA-256) dans le projet Android Capacitor customer-space.
set -euo pipefail

ANDROID_DIR="${1:?android directory required}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_DIR="$SCRIPT_DIR/../workflows/android-config-customer-space"

JAVA_PKG_DIR="$ANDROID_DIR/app/src/main/java/com/optimize/elykia/customer"
mkdir -p "$JAVA_PKG_DIR"

cp "$CONFIG_DIR/AppUpdatePlugin.java" "$JAVA_PKG_DIR/AppUpdatePlugin.java"
cp "$CONFIG_DIR/MainActivity.java" "$JAVA_PKG_DIR/MainActivity.java"

echo "AppUpdate native plugin installed in $JAVA_PKG_DIR"
