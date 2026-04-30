#!/usr/bin/env bash
set -euo pipefail

# Usage: setup_nginx.sh <domain> <email>
# Installe nginx, certbot, dépose la conf et tente d'obtenir un certificat Let's Encrypt

DOMAIN="$1"
EMAIL="$2"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "Usage: $0 <domain> <email>" >&2
  exit 2
fi

echo "Installing nginx and certbot..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

NGINX_CONF="/etc/nginx/sites-available/elykia.conf"
NGINX_LINK="/etc/nginx/sites-enabled/elykia.conf"

echo "Copying template nginx config"
sudo mkdir -p /etc/nginx/elykia
sudo cp "$(dirname "$0")/nginx/elykia.conf" /etc/nginx/elykia/elykia.conf.tmpl
sudo sed "s/YOUR_DOMAIN_HERE/$DOMAIN/g" /etc/nginx/elykia/elykia.conf.tmpl | sudo tee "$NGINX_CONF" >/dev/null

if [ -L "$NGINX_LINK" ]; then
  sudo rm -f "$NGINX_LINK"
fi
sudo ln -s "$NGINX_CONF" "$NGINX_LINK"

echo "Testing nginx config"
sudo nginx -t
sudo systemctl reload nginx

echo "Requesting TLS certificate from Let's Encrypt for $DOMAIN"
sudo certbot --nginx --non-interactive --agree-tos --email "$EMAIL" -d "$DOMAIN"

echo "Done. nginx configured for $DOMAIN"

