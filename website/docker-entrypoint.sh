#!/bin/sh
set -eu
API_BASE="${ELYKIA_API_BASE:-https://elykia.amenouveve-yaveh.com/api}"
mkdir -p /usr/share/nginx/html/js
printf "window.ELYKIA_API_BASE = '%s';\n" "$API_BASE" > /usr/share/nginx/html/js/config.js
exec nginx -g 'daemon off;'
