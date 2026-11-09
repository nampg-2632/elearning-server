#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 VPS for the production stack.
# Safe to run again: every step checks what is already there.
#
# Run as root on the VPS:
#   DEPLOY_PUBKEY="ssh-ed25519 AAAA... github-actions-deploy" bash setup-vps.sh
#
# Optional:
#   SWAP_SIZE=2G               swap file size (skipped when swap exists)
#   DISABLE_PASSWORD_LOGIN=1   SSH by key only; make sure your own key works first
set -euo pipefail

DEPLOY_USER=deploy
APP_DIR=/opt/elearning
SWAP_SIZE=${SWAP_SIZE:-2G}
DISABLE_PASSWORD_LOGIN=${DISABLE_PASSWORD_LOGIN:-0}

log() { printf '\n==> %s\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi
if [[ -z ${DEPLOY_PUBKEY:-} ]]; then
  echo "Set DEPLOY_PUBKEY to the public key GitHub Actions deploys with." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

log "System packages"
apt-get update
apt-get upgrade -y
apt-get install -y ca-certificates curl ufw fail2ban unattended-upgrades

log "Docker Engine and Compose plugin"
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  # shellcheck source=/dev/null
  codename=$(. /etc/os-release && echo "$VERSION_CODENAME")
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $codename stable" \
    >/etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
# Rotate container logs so they cannot fill the disk.
if [[ ! -f /etc/docker/daemon.json ]]; then
  cat >/etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF
  systemctl restart docker
fi
systemctl enable --now docker

log "Swap ($SWAP_SIZE)"
if ! swapon --show | grep -q .; then
  fallocate -l "$SWAP_SIZE" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >>/etc/fstab
fi

log "User $DEPLOY_USER"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos '' "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"
deploy_home=$(getent passwd "$DEPLOY_USER" | cut -d: -f6)
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$deploy_home/.ssh"
keys="$deploy_home/.ssh/authorized_keys"
touch "$keys"
grep -qxF "$DEPLOY_PUBKEY" "$keys" || echo "$DEPLOY_PUBKEY" >>"$keys"
chown "$DEPLOY_USER:$DEPLOY_USER" "$keys"
chmod 600 "$keys"
install -d -m 750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR"

log "Firewall: SSH, HTTP, HTTPS only"
# Allow the port sshd really listens on, so enabling ufw cannot lock us out.
ssh_port=$(sshd -T 2>/dev/null | awk '$1 == "port" { print $2; exit }')
ssh_port=${ssh_port:-22}
ufw allow "$ssh_port/tcp"
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
# Docker publishes ports through its own iptables rules, bypassing ufw: only
# Caddy may publish ports in production; Postgres and Redis must not.

log "fail2ban (SSH brute force)"
systemctl enable --now fail2ban

log "Automatic security updates"
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
systemctl enable --now unattended-upgrades

if [[ $DISABLE_PASSWORD_LOGIN == 1 ]]; then
  log "SSH: key login only"
  cat >/etc/ssh/sshd_config.d/10-key-only.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
  sshd -t
  systemctl reload ssh
fi

log "Done"
docker --version
docker compose version
swapon --show
ufw status
echo "App directory: $APP_DIR (owned by $DEPLOY_USER)"
