#!/usr/bin/env bash
# Garantit que l'APK customer-space embarque l'URL d'API de sa cible (test / prod).
#
# Usage :
#   verify-customer-space-api-url.sh pre-build  <environment.prod.ts> <api_url> [target]
#   verify-customer-space-api-url.sh post-build <www_dir> <api_url>
#
# pre-build  : URL non vide en https, une seule ligne apiUrl remplacée par l'URL littérale
#              (aucune lecture runtime ne doit subsister dans l'APK).
# post-build : l'URL est présente dans le bundle JS, et assets/env.js porte la même valeur.
set -euo pipefail

MODE="${1:-}"
TARGET_PATH="${2:-}"
API_URL="${3:-}"
TARGET="${4:-}"

die() {
  echo "ERROR: $1" >&2
  exit 1
}

[ -n "$MODE" ] && [ -n "$TARGET_PATH" ] || die "usage: $0 <pre-build|post-build> <path> <api_url> [target]"
[ -n "$API_URL" ] || die "api-url est vide (secret TEST_API_URL / PROD_API_URL manquant ?)"
case "$API_URL" in
  https://*) ;;
  *) die "api-url doit commencer par https:// (reçu: $API_URL)" ;;
esac
case "$API_URL" in
  *"'"*|*'|'*|*' '*|*'&'*|*'\'*) die "api-url contient un caractère interdit (quote, pipe, espace, & ou \\)" ;;
esac

API_HOST="$(printf '%s' "$API_URL" | sed -E 's#^https://([^/]+).*#\1#')"

case "$MODE" in
  pre-build)
    [ -f "$TARGET_PATH" ] || die "fichier introuvable: $TARGET_PATH"
    count="$(grep -cE 'apiUrl:' "$TARGET_PATH" || true)"
    [ "$count" = "1" ] || die "$TARGET_PATH doit contenir exactement une ligne apiUrl: (trouvé: $count)"
    grep -qF "apiUrl: '${API_URL}'," "$TARGET_PATH" \
      || die "$TARGET_PATH ne contient pas apiUrl: '${API_URL}', (sed non appliqué ?)"
    if grep -q 'resolveRuntimeApiUrl(' "$TARGET_PATH"; then
      die "$TARGET_PATH lit encore l'URL au runtime — l'APK doit embarquer l'URL littérale"
    fi
    echo "OK pre-build: target=${TARGET:-?} api_host=${API_HOST}"
    ;;
  post-build)
    [ -d "$TARGET_PATH" ] || die "dossier introuvable: $TARGET_PATH"
    # Angular bundles live at the www/ root; assets/env.js is excluded on purpose.
    shopt -s nullglob
    bundles=("$TARGET_PATH"/*.js)
    shopt -u nullglob
    [ "${#bundles[@]}" -gt 0 ] || die "aucun bundle JS dans $TARGET_PATH"
    if ! grep -qF "$API_URL" "${bundles[@]}"; then
      die "URL d'API absente du bundle JS dans $TARGET_PATH"
    fi
    ENV_JS="$TARGET_PATH/assets/env.js"
    if [ -f "$ENV_JS" ]; then
      sed -i "s|__CUSTOMER_SPACE_API_URL__|${API_URL}|g" "$ENV_JS"
      grep -qF "$API_URL" "$ENV_JS" || die "assets/env.js ne porte pas l'URL d'API"
    fi
    echo "OK post-build: bundle et assets/env.js alignés sur api_host=${API_HOST}"
    ;;
  *)
    die "mode inconnu: $MODE (attendu: pre-build | post-build)"
    ;;
esac
