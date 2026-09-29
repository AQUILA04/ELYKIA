#!/bin/sh
set -eu
API_BASE="${ELYKIA_API_BASE:-https://elykia.amenouveve-yaveh.com/api}"
CUSTOMER_SPACE_URL="${CUSTOMER_SPACE_URL:-https://clients.amenouveve-yaveh.com}"
CUSTOMER_SPACE_URL="${CUSTOMER_SPACE_URL%/}"
mkdir -p /usr/share/nginx/html/js
{
  printf "window.ELYKIA_API_BASE = '%s';\n" "$API_BASE"
  printf "window.ELYKIA_CUSTOMER_SPACE_URL = '%s';\n" "$CUSTOMER_SPACE_URL"
} > /usr/share/nginx/html/js/config.js
exec nginx -g 'daemon off;'
