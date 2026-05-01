#!/bin/sh
# docker-entrypoint.sh
# Interpolates environment variables into env.js at container startup.
# This allows runtime configuration without rebuilding the image.
#
# Variables replaced:
#   __API_URL__            → $API_URL            (e.g. http://159.89.225.112/api)
#   __GA_MEASUREMENT_ID__  → $GA_MEASUREMENT_ID  (e.g. G-XXXXXXXXXX)

set -e

ENV_JS="/usr/share/nginx/html/assets/js/env.js"

# Apply substitutions only if the placeholders are still present (idempotent)
sed -i "s|__API_URL__|${API_URL:-}|g" "$ENV_JS"
sed -i "s|__GA_MEASUREMENT_ID__|${GA_MEASUREMENT_ID:-}|g" "$ENV_JS"

echo "[entrypoint] env.js configured:"
echo "  API_URL           = ${API_URL:-<not set>}"
echo "  GA_MEASUREMENT_ID = ${GA_MEASUREMENT_ID:-<not set>}"

# Hand off to nginx
exec nginx -g "daemon off;"
