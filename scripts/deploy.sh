#!/usr/bin/env bash
# ==============================================================================
# HOTEL CONTRACT MANAGER - VPS DEPLOYMENT & UPDATE SCRIPT
# Safe, idempotent deployment and update automation for production hosts.
# ==============================================================================
set -euo pipefail

# 1. Determine project directory safely
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_DIR}"

echo "============================================================"
echo " Starting Hotel Contract Manager Deployment"
echo " Project Directory: ${PROJECT_DIR}"
echo " Time: $(date -Is)"
echo "============================================================"

# 2. Verify Docker and Docker Compose prerequisites
if ! command -v docker &> /dev/null; then
  echo "[-] ERROR: Docker is not installed or not in PATH."
  echo "    Please install Docker Engine before running this script."
  exit 1
fi

if ! docker compose version &> /dev/null; then
  echo "[-] ERROR: 'docker compose' (v2 plugin) is not available."
  echo "    Please install docker-compose-plugin."
  exit 1
fi

# 3. Verify .env file existence
if [ ! -f ".env" ]; then
  echo "[-] ERROR: Production configuration file '.env' not found in ${PROJECT_DIR}."
  echo "    Please copy .env.example to .env and configure production values."
  echo "    Command: cp .env.example .env && chmod 600 .env"
  exit 1
fi

# 4. Verify mandatory JWT_SECRET is configured and non-empty
JWT_SECRET_VALUE="$(grep -E '^JWT_SECRET=' .env | cut -d'=' -f2- | tr -d '\"' | tr -d "'" || true)"
if [ -z "${JWT_SECRET_VALUE}" ]; then
  echo "[-] ERROR: JWT_SECRET is missing or empty in .env."
  echo "    A strong secret is required to secure user sessions."
  echo "    Generate one with: openssl rand -base64 48"
  exit 1
fi

if [ ${#JWT_SECRET_VALUE} -lt 32 ]; then
  echo "[!] WARNING: JWT_SECRET is shorter than 32 characters. Consider using a 48+ character secret."
fi

# 5. Ensure persistent storage directories exist
echo "[+] Checking persistent storage directories..."
mkdir -p data uploads/contracts

# 6. Check host directory permissions (Node.js container runs as UID 1000)
# Ensure directories are writable
if [ ! -w "data" ] || [ ! -w "uploads" ]; then
  echo "[!] Attempting to adjust ownership of data/ and uploads/ to UID 1000..."
  if [ "$(id -u)" -eq 0 ]; then
    chown -R 1000:1000 data uploads
  else
    echo "[-] WARNING: data/ or uploads/ is not writable by current user."
    echo "    If container permissions fail, run: sudo chown -R 1000:1000 data uploads"
  fi
fi

# 7. Build production Docker image
echo "[+] Building production container image..."
docker compose build

# 8. Launch container in detached mode with restart policy
echo "[+] Starting container..."
docker compose up -d

# 9. Wait and poll application healthcheck
echo "[+] Verifying container health on http://127.0.0.1:3000/api/health..."
MAX_ATTEMPTS=30
ATTEMPT=1
HEALTHY=false

while [ "${ATTEMPT}" -le "${MAX_ATTEMPTS}" ]; do
  if curl -sf http://127.0.0.1:3000/api/health > /dev/null 2>&1; then
    HEALTHY=true
    break
  fi
  echo "    Waiting for application startup... (Attempt ${ATTEMPT}/${MAX_ATTEMPTS})"
  sleep 2
  ATTEMPT=$((ATTEMPT + 1))
done

if [ "${HEALTHY}" = true ]; then
  echo "[+] SUCCESS: Application is healthy and responding with HTTP 200!"
else
  echo "[-] ERROR: Application failed to become healthy within $((MAX_ATTEMPTS * 2)) seconds."
  echo "    Recent container logs:"
  docker compose logs --tail=40
  exit 1
fi

# 10. Display container status and recent logs
echo ""
echo "--- Container Status ---"
docker compose ps

echo ""
echo "--- Recent Logs ---"
docker compose logs --tail=15

echo ""
echo "============================================================"
echo " Deployment completed successfully at $(date -Is)!"
echo "============================================================"
