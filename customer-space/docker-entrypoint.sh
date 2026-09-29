#!/bin/sh
# Injecte l'URL de l'API dans assets/env.js au démarrage du conteneur.
#   __CUSTOMER_SPACE_API_URL__ -> $CUSTOMER_SPACE_API_URL (ex. https://elykia-test.amenouveve-yaveh.com/api)
set -eu

ENV_JS="/usr/share/nginx/html/assets/env.js"
API_URL="${CUSTOMER_SPACE_API_URL:-}"

if [ -z "$API_URL" ]; then
  echo "[entrypoint] ERROR: CUSTOMER_SPACE_API_URL is required" >&2
  exit 1
fi

case "$API_URL" in
  *"'"*|*'|'*|*'&'*|*'\'*|*' '*)
    echo "[entrypoint] ERROR: CUSTOMER_SPACE_API_URL contains a forbidden character" >&2
    exit 1
    ;;
esac

sed -i "s|__CUSTOMER_SPACE_API_URL__|${API_URL}|g" "$ENV_JS"

echo "[entrypoint] env.js configured: CUSTOMER_SPACE_API_URL=${API_URL}"

exec nginx -g 'daemon off;'
