#!/usr/bin/env bash
# Publie un APK release customer-space vers MinIO et met à jour le manifest du canal (test/prod).
set -euo pipefail

APK_PATH="${1:?APK path required}"
TARGET="${2:?target required (test|prod)}"
VERSION="${3:?version required}"

MINIO_ENDPOINT="${MINIO_ENDPOINT:?MINIO_ENDPOINT required}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:?MINIO_ACCESS_KEY required}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:?MINIO_SECRET_KEY required}"
# Contabo : buckets pré-provisionnés (test ≠ prod). Aligné sur deploy/docker-compose.*.yml
if [[ -n "${MINIO_CUSTOMER_SPACE_RELEASES_BUCKET:-}" ]]; then
  MINIO_BUCKET="$MINIO_CUSTOMER_SPACE_RELEASES_BUCKET"
elif [[ "$TARGET" == "test" ]]; then
  MINIO_BUCKET="elykia-customer-space-releases-test"
else
  MINIO_BUCKET="elykia-customer-space-releases"
fi

if [[ ! -f "$APK_PATH" ]]; then
  echo "APK not found: $APK_PATH" >&2
  exit 1
fi

if [[ "$TARGET" != "test" && "$TARGET" != "prod" ]]; then
  echo "Invalid target: $TARGET (expected test or prod)" >&2
  exit 1
fi

VERSION="${VERSION%%.M*}"
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"
if [[ -z "${MAJOR:-}" || -z "${MINOR:-}" || -z "${PATCH:-}" ]]; then
  echo "Invalid semver: $VERSION" >&2
  exit 1
fi
VERSION_CODE=$((MAJOR * 10000 + MINOR * 100 + PATCH))

APK_BASENAME="elykia-customer-${TARGET}-v${VERSION}.apk"
APK_OBJECT_KEY="${TARGET}/releases/${VERSION}/${APK_BASENAME}"
MANIFEST_OBJECT_KEY="${TARGET}/manifest.json"
MC_ALIAS="elykia-customer-release"

SHA256=$(sha256sum "$APK_PATH" | awk '{print $1}')
SIZE_BYTES=$(stat -c%s "$APK_PATH" 2>/dev/null || stat -f%z "$APK_PATH")
PUBLISHED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mask_key() {
  local key="$1"
  local len=${#key}
  if [[ "$len" -le 8 ]]; then
    echo "(len=${len})"
  else
    echo "${key:0:4}…${key: -4} (len=${len})"
  fi
}

echo "Publishing $APK_BASENAME to MinIO bucket=$MINIO_BUCKET key=$APK_OBJECT_KEY"
echo "versionCode=$VERSION_CODE sha256=$SHA256 size=$SIZE_BYTES"
echo "MinIO publish diagnostics:"
echo "  endpoint=${MINIO_ENDPOINT}"
echo "  target=${TARGET}"
echo "  bucket=${MINIO_BUCKET}"
echo "  alias=${MC_ALIAS}"
echo "  access_key=$(mask_key "$MINIO_ACCESS_KEY")"
echo "  secret_key=*** (len=${#MINIO_SECRET_KEY})"
echo "  object_key=${APK_OBJECT_KEY}"
echo "  manifest_key=${MANIFEST_OBJECT_KEY}"
echo "  apk_path=${APK_PATH}"

MC_BIN="${MC_BIN:-mc}"
if ! command -v "$MC_BIN" &>/dev/null; then
  MC_BIN="/tmp/mc"
  if [[ ! -x "$MC_BIN" ]]; then
    # dl.min.io renvoie 410 (binaires MinIO community retirés) — utiliser GitHub Releases.
    MC_VERSION="${MC_VERSION:-RELEASE.2025-08-13T08-35-41Z}"
    MC_URL="https://github.com/minio/mc/releases/download/${MC_VERSION}/mc.linux-amd64.${MC_VERSION}"
    echo "Downloading mc from ${MC_URL}"
    curl -fsSL --proto '=https' --tlsv1.2 "$MC_URL" -o "$MC_BIN"
    chmod +x "$MC_BIN"
  fi
fi

"$MC_BIN" alias set "$MC_ALIAS" "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" --api S3v4

echo "Buckets visible via this alias (${MC_ALIAS}/):"
set +e
LS_OUT=$("$MC_BIN" ls "${MC_ALIAS}/" 2>&1)
LS_RC=$?
set -e
echo "$LS_OUT"
echo "  mc ls exit_code=${LS_RC}"

# Contabo Object Storage: CreateBucket via API often fails even when the bucket
# already exists in the console. Prefer access check; only attempt mb as fallback.
ensure_bucket() {
  local alias_bucket="$1"
  local out rc
  set +e
  out=$("$MC_BIN" ls "$alias_bucket" 2>&1)
  rc=$?
  set -e
  if [[ "$rc" -eq 0 ]]; then
    echo "Bucket accessible: $alias_bucket"
    return 0
  fi
  echo "Bucket not listed yet; attempting create: $alias_bucket"
  echo "  mc ls stderr/stdout: $out"
  set +e
  out=$("$MC_BIN" mb --ignore-existing "$alias_bucket" 2>&1)
  rc=$?
  set -e
  if [[ "$rc" -eq 0 ]]; then
    echo "Bucket create succeeded: $alias_bucket"
    return 0
  fi
  echo "  mc mb stderr/stdout: $out"
  set +e
  out=$("$MC_BIN" ls "$alias_bucket" 2>&1)
  rc=$?
  set -e
  if [[ "$rc" -eq 0 ]]; then
    echo "Bucket accessible after create attempt: $alias_bucket"
    return 0
  fi
  echo "ERROR: bucket not accessible: $alias_bucket" >&2
  echo "  final mc ls stderr/stdout: $out" >&2
  echo "Compare endpoint above with your MinIO console URL." >&2
  echo "Expected bucket name: elykia-customer-space-releases[-test]." >&2
  return 1
}
ensure_bucket "${MC_ALIAS}/${MINIO_BUCKET}"

"$MC_BIN" cp "$APK_PATH" "${MC_ALIAS}/${MINIO_BUCKET}/${APK_OBJECT_KEY}"

MANIFEST_FILE="$(mktemp)"
trap 'rm -f "$MANIFEST_FILE"' EXIT

cat > "$MANIFEST_FILE" <<EOF
{
  "version": "${VERSION}",
  "versionCode": ${VERSION_CODE},
  "minSupportedVersionCode": ${VERSION_CODE},
  "mandatory": false,
  "releaseNotes": "Release ${VERSION} (${TARGET})",
  "apkObjectKey": "${APK_OBJECT_KEY}",
  "sha256": "${SHA256}",
  "sizeBytes": ${SIZE_BYTES},
  "publishedAt": "${PUBLISHED_AT}"
}
EOF

"$MC_BIN" cp "$MANIFEST_FILE" "${MC_ALIAS}/${MINIO_BUCKET}/${MANIFEST_OBJECT_KEY}"

echo "Manifest published: ${MANIFEST_OBJECT_KEY}"
echo "APK published successfully."
