#!/usr/bin/env bash
set -euo pipefail

echo ">>> Updating deploy scripts from GitHub..."
rm -rf /tmp/elykia_src
git clone https://github.com/AQUILA04/ELYKIA.git /tmp/elykia_src > /dev/null 2>&1

echo ">>> Applying new scripts..."
# Copy to a temporary sibling directory
cp -r /tmp/elykia_src/deploy /opt/elykia/deploy.new
rm -rf /tmp/elykia_src

# Ensure permissions
if id "deploy" &>/dev/null; then
    chown -R deploy:deploy /opt/elykia/deploy.new
fi
chmod +x /opt/elykia/deploy.new/*.sh
if [ -d "/opt/elykia/deploy.new/lib" ]; then
    chmod +x /opt/elykia/deploy.new/lib/*.sh 2>/dev/null || true
fi

# Atomic swap: rename old deploy dir, then move new one in place
BACKUP_DIR="/opt/elykia/deploy.old_$(date +%s)"
if [ -d "/opt/elykia/deploy" ]; then
    mv /opt/elykia/deploy "$BACKUP_DIR"
fi
mv /opt/elykia/deploy.new /opt/elykia/deploy

echo ">>> Update complete! Old scripts backed up in $BACKUP_DIR"
