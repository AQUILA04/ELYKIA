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

ENV_PROD="$ROOT/customer-space/src/environments/environment.prod.ts"
API_LINES="$(grep -cE 'apiUrl:' "$ENV_PROD" || true)"
if [ "$API_LINES" = "1" ]; then
  pass "environment.prod.ts has exactly one apiUrl: line"
else
  fail "environment.prod.ts must have exactly one apiUrl: line (found $API_LINES)"
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Replay the action sed + pre/post-build checks on a copy.
SAMPLE_URL="https://elykia-test.amenouveve-yaveh.com/api"
cp "$ENV_PROD" "$WORK/environment.prod.ts"
sed -i "s|apiUrl:.*|apiUrl: '${SAMPLE_URL}',|" "$WORK/environment.prod.ts"
if bash "$ROOT/.github/scripts/verify-customer-space-api-url.sh" pre-build \
  "$WORK/environment.prod.ts" "$SAMPLE_URL" test >/dev/null; then
  pass "sed + pre-build API URL check"
else
  fail "pre-build API URL check rejects the sed output"
fi
if bash "$ROOT/.github/scripts/verify-customer-space-api-url.sh" pre-build \
  "$ENV_PROD" "$SAMPLE_URL" test >/dev/null 2>&1; then
  fail "pre-build check must reject an environment.prod.ts without sed"
else
  pass "pre-build check rejects un-injected environment.prod.ts"
fi
if bash "$ROOT/.github/scripts/verify-customer-space-api-url.sh" pre-build \
  "$WORK/environment.prod.ts" "" test >/dev/null 2>&1; then
  fail "pre-build check must reject an empty api-url"
else
  pass "pre-build check rejects empty api-url"
fi
mkdir -p "$WORK/www/assets"
printf "const e={apiUrl:'%s'};\n" "$SAMPLE_URL" > "$WORK/www/main.abc.js"
cp "$ROOT/customer-space/src/assets/env.js" "$WORK/www/assets/env.js"
if bash "$ROOT/.github/scripts/verify-customer-space-api-url.sh" post-build \
  "$WORK/www" "$SAMPLE_URL" >/dev/null \
  && grep -qF "$SAMPLE_URL" "$WORK/www/assets/env.js"; then
  pass "post-build API URL check aligns assets/env.js"
else
  fail "post-build API URL check"
fi
printf "const e={apiUrl:'https://elykia.amenouveve-yaveh.com/api'};\n" > "$WORK/www/main.abc.js"
if bash "$ROOT/.github/scripts/verify-customer-space-api-url.sh" post-build \
  "$WORK/www" "$SAMPLE_URL" >/dev/null 2>&1; then
  fail "post-build check must reject a bundle without the target URL"
else
  pass "post-build check rejects bundle with another URL"
fi

APK_WORKFLOW="$ROOT/.github/workflows/build-customer-space-apk.yml"
if grep -qF 'api-url: ${{ secrets.TEST_API_URL }}' "$APK_WORKFLOW" \
  && grep -qF 'api-url: ${{ secrets.PROD_API_URL }}' "$APK_WORKFLOW"; then
  pass "APK jobs pass TEST_API_URL / PROD_API_URL"
else
  fail "APK jobs must pass secrets.TEST_API_URL (test) and secrets.PROD_API_URL (prod)"
fi
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

AAB_DIR="$WORK/aab/release"
mkdir -p "$AAB_DIR"
echo fake > "$AAB_DIR/app-release.aab"
OUT="$(bash "$ROOT/.github/scripts/resolve-release-aab.sh" "$AAB_DIR" "prod.aab")"
echo "$OUT" | grep -q '^AAB_PATH=.*/prod.aab$' || fail "resolve-release-aab output"
[ -f "$AAB_DIR/prod.aab" ] || fail "resolve-release-aab rename"
pass "resolve-release-aab.sh"

grep -q "APP_VERSION" "$ROOT/customer-space/src/environments/app-version.ts" || fail "app-version.ts missing"
pass "app-version.ts present"

CONFIG_DIR="$ROOT/.github/workflows/android-config-customer-space"
for f in AndroidManifest.xml config.xml network_security_config.xml file_paths.xml MainActivity.java AppUpdatePlugin.java DeviceSettingsPlugin.java; do
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

# Firebase Crashlytics Gradle wiring (shared with mobile)
bash "$ROOT/.github/scripts/configure-android-firebase.sh" "$WORK/android"
grep -q "firebase-crashlytics-gradle" "$WORK/android/build.gradle" \
  || fail "configure-android-firebase.sh did not add crashlytics classpath"
grep -q "com.google.firebase.crashlytics" "$WORK/android/app/build.gradle" \
  || fail "configure-android-firebase.sh did not apply crashlytics plugin"
grep -q "firebase-crashlytics" "$WORK/android/app/build.gradle" \
  || fail "configure-android-firebase.sh did not add firebase-crashlytics dep"
grep -q "configure-android-firebase.sh" "$ROOT/.github/actions/build-customer-space-apk/action.yml" \
  || fail "build-customer-space-apk action missing configure-android-firebase.sh"
pass "configure-android-firebase.sh for customer-space"

ACTION_YML="$ROOT/.github/actions/build-customer-space-apk/action.yml"
grep -q 'release-format:' "$ACTION_YML" || fail "action missing release-format input"
grep -q 'bundleRelease' "$ACTION_YML" || fail "action missing bundleRelease"
grep -q "inputs.release-format == 'apk'" "$ACTION_YML" \
  || fail "MinIO publish must stay limited to apk builds"
pass "release-format apk/aab split"

grep -q 'name: Build PROD APK ${{ needs.prepare.outputs.build_sha }}' "$APK_WORKFLOW" \
  || fail "prod APK job name must embed build_sha for the Play workflow"
pass "prod APK job name embeds build_sha"

PLAY_WORKFLOW="$ROOT/.github/workflows/publish-customer-space-play.yml"
[ -f "$PLAY_WORKFLOW" ] || fail "missing publish-customer-space-play.yml"
grep -q 'tracks: internal' "$PLAY_WORKFLOW" || fail "Play workflow must target the internal track"
if grep -qE 'tracks:.*production' "$PLAY_WORKFLOW"; then
  fail "Play workflow must not target the production track"
else
  pass "Play workflow stays on the internal track"
fi
grep -q 'release-format: aab' "$PLAY_WORKFLOW" || fail "Play workflow must build an aab"
grep -q 'ELYKIA Customer Space APK Build' "$PLAY_WORKFLOW" \
  || fail "Play workflow must trigger from the customer-space APK workflow"
grep -q 'com.optimize.elykia.customer' "$PLAY_WORKFLOW" \
  || fail "Play workflow package name"
pass "publish-customer-space-play.yml"

echo ""
if [ "$FAILURES" -gt 0 ]; then
  echo "$FAILURES validation(s) failed" >&2
  exit 1
fi
echo "All customer-space pipeline validations passed."
