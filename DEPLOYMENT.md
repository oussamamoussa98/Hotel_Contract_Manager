# HOTEL CONTRACT MANAGER — PRODUCTION DEPLOYMENT GUIDE

This document provides complete, step-by-step instructions for deploying and maintaining the **Hotel Contract Manager** on a dedicated Linux Virtual Private Server (VPS) using Docker Compose and the Caddy reverse proxy.

---

## 1. VPS REQUIREMENTS

| Resource | Minimum Specification | Recommended Specification |
|---|---|---|
| **CPU** | 1 vCPU | 2 vCPU |
| **RAM** | 1 GB RAM + 1 GB Swap | 2 GB RAM |
| **Disk** | 20 GB SSD | 40 GB NVMe SSD |
| **OS** | Ubuntu 22.04 / 24.04 LTS or Debian 12 | Ubuntu 24.04 LTS |
| **Network** | 1 Static Public IPv4 Address | 1 Static Public IPv4 Address |

---

## 2. UBUNTU / DEBIAN PREPARATION & FIREWALL

Connect to your VPS via SSH and update system packages:

```bash
# 1. Update package lists and upgrade system
sudo apt update && sudo apt upgrade -y

# 2. Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (Let's Encrypt / ACME validation)
sudo ufw allow 443/tcp   # HTTPS (Production web traffic)
sudo ufw enable

# Verify firewall status (Port 3000 must NOT be exposed)
sudo ufw status
```

---

## 3. DOCKER & DOCKER COMPOSE INSTALLATION

Install the official Docker Engine and Compose plugin:

```bash
# 1. Install prerequisites
sudo apt install -y ca-certificates curl gnupg

# 2. Add Docker official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 3. Set up repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Install Docker Engine and Compose plugin
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 5. Add your user to the docker group (optional, to avoid typing sudo)
sudo usermod -aG docker $USER
```

---

## 4. CADDY REVERSE PROXY INSTALLATION

Caddy acts as the front-facing HTTPS reverse proxy. It automatically obtains, installs, and renews TLS certificates from Let's Encrypt with zero maintenance.

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

---

## 5. PROJECT CLONING & DIRECTORY SETUP

Set up the application directory under `/opt/hotel-contract-manager`:

```bash
sudo mkdir -p /opt/hotel-contract-manager
sudo chown -R $USER:$USER /opt/hotel-contract-manager
git clone <YOUR_GIT_REPOSITORY_URL> /opt/hotel-contract-manager
cd /opt/hotel-contract-manager
```

---

## 6. ENVIRONMENT CONFIGURATION & JWT SECRET GENERATION

Copy the production environment template:

```bash
cp .env.example .env
```

Generate a cryptographically secure 64-character random string on the server:

```bash
openssl rand -base64 48
```

Open `.env` in an editor and insert the generated secret:

```ini
NODE_ENV=production
PORT=3000
JWT_SECRET=your_generated_random_64_char_secret_from_above
JWT_EXPIRES_IN=8h
APP_URL=https://contracts.youragency.tn
TRUST_PROXY=1
```

Set strict file permissions so only your user can read `.env`:

```bash
chmod 600 .env
```

---

## 7. PERSISTENCE DIRECTORY PERMISSIONS

The Docker container runs as the unprivileged user `node` (UID `1000`). Ensure the local host storage directories are owned by UID `1000`:

```bash
mkdir -p data uploads/contracts
sudo chown -R 1000:1000 data uploads
```

---

## 8. FIRST DEPLOYMENT

Execute the automated deployment script:

```bash
./scripts/deploy.sh
```

This script:
1. Validates that Docker, Docker Compose, `.env`, and `JWT_SECRET` are present.
2. Builds the multi-stage production Docker image.
3. Starts the container in detached mode with `restart: unless-stopped`.
4. Polls the internal healthcheck endpoint `http://127.0.0.1:3000/api/health` until it returns HTTP 200.
5. Displays container status and recent startup logs.

---

## 9. DNS CONFIGURATION

Before configuring Caddy, point your agency's domain name to the VPS:
- **Record Type:** `A`
- **Host / Name:** `contracts` (for `contracts.youragency.tn`) or `@` (for apex domain)
- **Value / Target:** Your VPS public IPv4 address (e.g. `203.0.113.10`)
- **TTL:** 300 seconds (5 minutes)

Verify DNS propagation:

```bash
dig +short contracts.youragency.tn
```

---

## 10. CADDY REVERSE PROXY CONFIGURATION

Copy the template from `deployment/Caddyfile`:

```bash
sudo cp deployment/Caddyfile /etc/caddy/Caddyfile
```

Edit `/etc/caddy/Caddyfile` and replace `contracts.youragency.tn` with your actual domain:

```caddy
contracts.youragency.tn {
    reverse_proxy 127.0.0.1:3000
    encode gzip zstd
}
```

Reload Caddy:

```bash
sudo systemctl reload caddy
```

---

## 11. HTTPS & HEALTH VERIFICATION

Test the external production endpoint over HTTPS:

```bash
curl -I https://contracts.youragency.tn/api/health
```

Expected response:
```http
HTTP/2 200
content-type: application/json; charset=utf-8
x-content-type-options: nosniff
x-frame-options: SAMEORIGIN
```

Open `https://contracts.youragency.tn` in a web browser. Log in using the administrator account and verify dashboard statistics and contract operations.

---

## 12. INITIAL CREDENTIAL RESET (MANDATORY)

Immediately upon first login as `admin@hotelcontracts.com`:
1. Navigate to **Administration** → **Utilisateurs**.
2. Click **Modifier le mot de passe** for the administrator account.
3. Change the password from the development default to a strong passphrase.
4. Update or replace the default agent account credentials.

---

## 13. AUTOMATED BACKUP SETUP

Schedule daily backups using the provided script `/opt/hotel-contract-manager/scripts/backup.sh`.

Create a cron job to run every night at 02:00 AM:

```bash
sudo crontab -e
```

Add the following line:

```cron
0 2 * * * /opt/hotel-contract-manager/scripts/backup.sh >> /var/log/hotel_contracts_backup.log 2>&1
```

Backups are saved to `/var/backups/hotel-contracts/` with SHA256 checksums and a 14-day automatic rotation policy.

To test the backup immediately:

```bash
sudo ./scripts/backup.sh
```

---

## 14. RESTORE PROCEDURE

To restore a specific backup archive:

```bash
sudo ./scripts/restore.sh /var/backups/hotel-contracts/contracts_backup_YYYYMMDD_HHMMSS.tar.gz
```

The restore script:
1. Verifies the SHA256 checksum of the archive.
2. Prompts for explicit interactive confirmation (`RESTORE`).
3. Stops the application container safely.
4. Creates a safety snapshot of current data before touching anything.
5. Extracts the backup archive into `data/` and `uploads/`.
6. Sets correct UID 1000 permissions.
7. Restarts the container and verifies `/api/health`.

---

## 15. APPLICATION UPDATE PROCEDURE

When deploying new application versions:

```bash
cd /opt/hotel-contract-manager

# 1. Trigger a pre-update backup
sudo ./scripts/backup.sh

# 2. Pull latest code from repository
git pull origin main

# 3. Execute safe deployment script
./scripts/deploy.sh
```

---

## 16. ROLLBACK PROCEDURE

If an update introduces unexpected behavior:

```bash
cd /opt/hotel-contract-manager

# 1. Revert to previous Git commit
git reset --hard HEAD@{1}

# 2. Re-run deployment script with the previous commit
./scripts/deploy.sh

# 3. If database restoration is required, restore the pre-update backup:
sudo ./scripts/restore.sh /var/backups/hotel-contracts/contracts_backup_TARGET.tar.gz
```

---

## 17. TROUBLESHOOTING

### Container fails to start
Check Docker container logs:
```bash
docker compose logs --tail=100
```
Common causes:
- Missing `JWT_SECRET` in `.env` (server will halt with fatal error).
- Host storage permission issue (run `sudo chown -R 1000:1000 data uploads`).

### 502 Bad Gateway from Caddy
Verify the Node.js application is running and listening on localhost port 3000:
```bash
curl -f http://127.0.0.1:3000/api/health
docker compose ps
```

### Rate limit blocking users behind proxy
Ensure `TRUST_PROXY=1` is set in `.env` and `app.set('trust proxy', 1)` is active in Express. This allows Express to read client IPs from the `X-Forwarded-For` header populated by Caddy.
