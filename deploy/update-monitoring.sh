#!/usr/bin/env bash
set -euo pipefail

MONITORING_DIR="/opt/elykia/deploy/monitoring"

echo ">>> Updating monitoring stack files from GitHub..."
rm -rf /tmp/elykia_src
git clone https://github.com/AQUILA04/ELYKIA.git /tmp/elykia_src > /dev/null 2>&1

echo ">>> Applying new monitoring files..."
cp -r /tmp/elykia_src/deploy/monitoring /opt/elykia/deploy/monitoring.new
rm -rf /tmp/elykia_src

if id "deploy" &>/dev/null; then
    chown -R deploy:deploy /opt/elykia/deploy/monitoring.new
fi

BACKUP_DIR="${MONITORING_DIR}.old_$(date +%s)"
if [ -d "$MONITORING_DIR" ]; then
    mv "$MONITORING_DIR" "$BACKUP_DIR"
fi
mv /opt/elykia/deploy/monitoring.new "$MONITORING_DIR"

echo ">>> Monitoring update complete! Old files backed up in $BACKUP_DIR"
