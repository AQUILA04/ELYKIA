#!/usr/bin/env bash
# =============================================================================
# setup-sftp.sh — Configure a restricted SFTP environment
# =============================================================================
set -euo pipefail

if [[ -z "${SFTP_PASSWORD:-}" ]]; then
    echo "Error: SFTP_PASSWORD environment variable is not set."
    exit 1
fi

SFTP_USER="elsftpu"
SFTP_GROUP="sftponly"

echo "=== Setting up restricted SFTP for user: $SFTP_USER ==="

# 1. Backup sshd_config
if [[ ! -f "/etc/ssh/sshd_config.bak" ]]; then
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
fi

# 2. Create group if it doesn't exist
if ! getent group "$SFTP_GROUP" > /dev/null; then
    groupadd "$SFTP_GROUP"
fi

# 3. Create user if it doesn't exist
if id "$SFTP_USER" &>/dev/null; then
    echo "User $SFTP_USER already exists."
else
    useradd -m -s /usr/sbin/nologin -G "$SFTP_GROUP" "$SFTP_USER"
    echo "User $SFTP_USER created."
fi

# 4. Set password
echo "$SFTP_USER:$SFTP_PASSWORD" | chpasswd

# 5. Configure chroot directory permissions
chown root:root "/home/$SFTP_USER"
chmod 755 "/home/$SFTP_USER"

mkdir -p "/home/$SFTP_USER/upload"
chown "$SFTP_USER:$SFTP_GROUP" "/home/$SFTP_USER/upload"
chmod 755 "/home/$SFTP_USER/upload"

# 6. Comment out any existing Subsystem sftp to avoid conflicts
sed -i 's/^Subsystem[ \t]*sftp.*/#&/' /etc/ssh/sshd_config

# 7. Configure OpenSSH
SSHD_CONF="/etc/ssh/sshd_config.d/sftp-chroot.conf"
cat > "$SSHD_CONF" << 'EOF'
# Configuration pour les utilisateurs SFTP du groupe sftponly
Subsystem sftp internal-sftp

Match Group sftponly
    ForceCommand internal-sftp
    ChrootDirectory %h
    AllowTcpForwarding no
    X11Forwarding no
    PermitTunnel no
EOF

echo "Testing SSH configuration..."
sshd -t

echo "Restarting SSH service..."
systemctl restart ssh

echo "SFTP environment for $SFTP_USER configured successfully."
