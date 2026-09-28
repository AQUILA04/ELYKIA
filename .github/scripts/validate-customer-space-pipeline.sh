#!/usr/bin/env bash
# Static/runtime checks for the customer-space APK pipeline — run locally before pushing.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FIXTURES="$ROOT/.github/scripts/fixtures"
FAILURES=0

fail() {
  echo "FAIL: $1" >&2
  FAILURES=$((FAILURES + 1))
}

pass() {
  echo "OK: $1"
}

echo "=== Validating customer-space APK pipeline scripts ==="

if grep -qE '^[[:space:]]+run: sed.*apiUrl:' "$ROOT/.github/actions/build-customer-space-apk/action.yml"; then
  fail "action.yml has inline sed run with apiUrl: — YAML parse risk"
else
  pass "action.yml sed step uses block scalar"
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/android/app"
cp "$FIXTURES/app.build.gradle.template" "$WORK/android/app/build.gradle"
cp "$FIXTURES/root.build.gradle.template" "$WORK/android/build.gradle"
printf '%s\n' 'storeFile=../keystore.jks' 'storePassword=test' 'keyAlias=test' 'keyPassword=test' > "$WORK/android/key.properties"
touch "$WORK/android/keystore.jks"

bash "$ROOT/.github/scripts/configure-android-signing.sh" "$WORK/android"
pass "configure-android-signing.sh on Capacitor template"

mkdir -p "$WORK/customer-space"
printf '%s\n' '{"name":"customer-space","version":"0.2.0"}' > "$WORK/customer-space/package.json"
bash "$ROOT/.github/scripts/sync-android-version.sh" "$WORK/android" "$WORK/customer-space/package.json"
grep -q 'versionName "0.2.0"' "$WORK/android/app/build.gradle" || fail "versionName not synced"
grep -q 'versionCode 200' "$WORK/android/app/build.gradle" || fail "versionCode not synced"
pass "sync-android-version.sh"

APK_DIR="$WORK/apk/release"
mkdir -p "$APK_DIR"
echo fake > "$APK_DIR/app-release-unsigned.apk"
OUT="$(bash "$ROOT/.github/scripts/resolve-release-apk.sh" "$APK_DIR" "test.apk")"
echo "$OUT" | grep -q '^APK_PATH=.*/test.apk$' || fail "resolve-release-apk output"
[ -f "$APK_DIR/test.apk" ] || fail "resolve-release-apk rename"
pass "resolve-release-apk.sh"

grep -q "APP_VERSION" "$ROOT/customer-space/src/environments/app-version.ts" || fail "app-version.ts missing"
pass "app-version.ts present"

CONFIG_DIR="$ROOT/.github/workflows/android-config-customer-space"
for f in AndroidManifest.xml config.xml network_security_config.xml file_paths.xml MainActivity.java AppUpdatePlugin.java; do
  [ -f "$CONFIG_DIR/$f" ] || fail "missing $CONFIG_DIR/$f"
done
pass "android-config-customer-space files"

ICON_SRC="$ROOT/customer-space/resources/icon.png"
[ -f "$ICON_SRC" ] || fail "missing $ICON_SRC"
pass "customer-space resources/icon.png present"

ICON_PACK="$ROOT/customer-space/resources/android-icons"
[ -d "$ICON_PACK" ] || fail "missing $ICON_PACK"
for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  for name in ic_launcher.png ic_launcher_round.png ic_launcher_foreground.png; do
    [ -f "$ICON_PACK/mipmap-${density}/${name}" ] \
      || fail "missing $ICON_PACK/mipmap-${density}/${name}"
  done
done
pass "customer-space resources/android-icons pack present"

ICON_WORK="$(mktemp -d)"
mkdir -p "$ICON_WORK/app/src/main/res"
# Copie du pack pré-généré — pas de ffmpeg requis en CI
bash "$ROOT/.github/scripts/apply-customer-space-android-icons.sh" "$ICON_WORK"
for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  for name in ic_launcher.png ic_launcher_round.png ic_launcher_foreground.png; do
    [ -f "$ICON_WORK/app/src/main/res/mipmap-${density}/${name}" ] \
      || fail "icon missing mipmap-${density}/${name}"
  done
done
grep -q '#0D1B2A' "$ICON_WORK/app/src/main/res/values/ic_launcher_background.xml" \
  || fail "launcher background color not navy"
rm -rf "$ICON_WORK"
pass "apply-customer-space-android-icons.sh"

echo ""
if [ "$FAILURES" -gt 0 ]; then
  echo "$FAILURES validation(s) failed" >&2
  exit 1
fi
echo "All customer-space pipeline validations passed."
