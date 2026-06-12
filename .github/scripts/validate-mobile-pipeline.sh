#!/usr/bin/env bash
# Static/runtime checks for the mobile APK pipeline — run locally before pushing.
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

echo "=== Validating mobile APK pipeline scripts ==="

if grep -qE '^[[:space:]]+run: sed.*apiUrl:' "$ROOT/.github/actions/build-mobile-apk/action.yml"; then
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
GRADLE="$WORK/android/app/build.gradle"

python3 - "$GRADLE" <<'PY'
import sys
text = open(sys.argv[1]).read()
checks = [
    ("keystore loader before android", text.index("def keystorePropertiesFile") < text.index("android {")),
    ("signingConfigs present", "signingConfigs {" in text),
    ("signingConfig in buildTypes", text.index("buildTypes {") < text.index("signingConfig signingConfigs.release")),
]
for name, ok in checks:
    if not ok:
        raise SystemExit(name)
print("signing patch structure valid")
PY
pass "configure-android-signing.sh on Capacitor template"

cp "$FIXTURES/app.build.gradle.template" "$WORK/android/app/build.gradle"
cp "$FIXTURES/root.build.gradle.template" "$WORK/android/build.gradle"
bash "$ROOT/.github/scripts/configure-android-firebase.sh" "$WORK/android"

python3 - "$WORK/android/app/build.gradle" "$WORK/android/build.gradle" <<'PY'
import sys
app, root = open(sys.argv[1]).read(), open(sys.argv[2]).read()
if "apply plugin: 'com.google.gms.google-services'" in app.split("try {")[0]:
    raise SystemExit("must not add google-services plugin at top (Capacitor try/catch handles it)")
if "firebase-crashlytics" not in app:
    raise SystemExit("crashlytics plugin missing")
if "firebase-crashlytics-gradle" not in root:
    raise SystemExit("crashlytics classpath missing in root")
print("firebase patch valid")
PY
pass "configure-android-firebase.sh"

mkdir -p "$WORK/mobile"
printf '%s\n' '{"name":"elykia-mobile","version":"2.8.5"}' > "$WORK/mobile/package.json"
bash "$ROOT/.github/scripts/sync-android-version.sh" "$WORK/android" "$WORK/mobile/package.json"
grep -q 'versionName "2.8.5"' "$WORK/android/app/build.gradle" || fail "versionName not synced"
grep -q 'versionCode 20805' "$WORK/android/app/build.gradle" || fail "versionCode not synced"
pass "sync-android-version.sh"

STYLE_SRC="$WORK/styles.xml"
cat > "$STYLE_SRC" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@drawable/splash</item>
    </style>
</resources>
XML
bash "$ROOT/.github/scripts/patch-android-status-bar-styles.sh" "$STYLE_SRC"
grep -q 'android:statusBarColor' "$STYLE_SRC" || fail "status bar styles not patched"
pass "patch-android-status-bar-styles.sh"

APK_DIR="$WORK/apk/release"
mkdir -p "$APK_DIR"
echo fake > "$APK_DIR/app-release-unsigned.apk"
OUT="$(bash "$ROOT/.github/scripts/resolve-release-apk.sh" "$APK_DIR" "test.apk")"
echo "$OUT" | grep -q '^APK_PATH=.*/test.apk$' || fail "resolve-release-apk output"
[ -f "$APK_DIR/test.apk" ] || fail "resolve-release-apk rename"
pass "resolve-release-apk.sh"

ENV_FILE="$ROOT/mobile/src/environments/environment.ts"
grep -q "version:" "$ENV_FILE" || fail "version field missing in environment.ts"
pass "environment.ts version field"

echo ""
if [ "$FAILURES" -gt 0 ]; then
  echo "$FAILURES validation(s) failed" >&2
  exit 1
fi
echo "All mobile pipeline validations passed."
