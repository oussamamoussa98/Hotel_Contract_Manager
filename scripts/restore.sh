#!/usr/bin/env bash
# ==============================================================================
# HOTEL CONTRACT MANAGER - PRODUCTION RESTORE SCRIPT
# Safely restores persistent business data and uploads from a verified backup archive.
# ==============================================================================
set -euo pipefail

# 1. Determine project directory safely
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_DIR}"

# 2. Require explicit backup archive path argument
if [ "$#" -lt 1 ]; then
  echo "[-] ERROR: Missing backup file argument."
  echo "    Usage: $0 /path/to/contracts_backup_YYYYMMDD_HHMMSS.tar.gz"
  echo ""
  echo "    Available backups in default directory (/var/backups/hotel-contracts):"
  ls -lh /var/backups/hotel-contracts/*.tar.gz 2>/dev/null || echo "    (No backups found in default directory)"
  exit 1
fi

TARGET_ARCHIVE="$1"

# 3. Verify archive file existence
if [ ! -f "${TARGET_ARCHIVE}" ]; then
  echo "[-] ERROR: Specified backup file does not exist: ${TARGET_ARCHIVE}"
  exit 1
fi

echo "============================================================"
echo " HOTEL CONTRACT MANAGER - DATABASE RESTORE"
echo " Target Archive: ${TARGET_ARCHIVE}"
echo " Destination:    ${PROJECT_DIR}"
echo " Time:           $(date -Is)"
echo "============================================================"

# 4. Verify SHA256 checksum if corresponding .sha256 file exists
CHECKSUM_FILE="${TARGET_ARCHIVE}.sha256"
if [ -f "${CHECKSUM_FILE}" ]; then
  echo "[+] Verifying SHA256 checksum against ${CHECKSUM_FILE}..."
  if sha256sum -c "${CHECKSUM_FILE}" 2>/dev/null; then
    echo "[+] Checksum VERIFIED successfully."
  else
    echo "[-] ERROR: SHA256 checksum mismatch! The archive may be corrupted or altered."
    exit 1
  fi
else
  echo "[!] WARNING: Checksum file '${CHECKSUM_FILE}' not found. Testing archive integrity with tar..."
  if ! tar -tzf "${TARGET_ARCHIVE}" > /dev/null 2>&1; then
    echo "[-] ERROR: Archive file appears corrupted or cannot be read by tar."
    exit 1
  fi
  echo "[+] Archive integrity test passed."
fi

# 5. Require explicit interactive confirmation (Safety guard against accidental invocation)
echo ""
echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo " WARNING: THIS OPERATION WILL OVERWRITE CURRENT DATA & UPLOADS"
echo " Current data/ and uploads/ will be replaced with contents of:"
echo "   ${TARGET_ARCHIVE}"
echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo ""

# Allow non-interactive bypass ONLY if FORCE_RESTORE=true is set
if [ "${FORCE_RESTORE:-false}" != "true" ]; then
  read -r -p "Are you ABSOLUTELY sure you want to proceed with restore? [type 'RESTORE' to confirm]: " CONFIRMATION
  if [ "${CONFIRMATION}" != "RESTORE" ]; then
    echo "[-] Restore operation cancelled by user. No files were modified."
    exit 0
  fi
fi

# 6. Stop running application container before touching storage files
echo "[+] Stopping application container..."
if command -v docker &>/dev/null && docker compose version &>/dev/null; then
  docker compose down || true
fi

# 7. Create a pre-restore safety backup of current state
PRE_RESTORE_DIR="${PROJECT_DIR}/.pre_restore_backup_$(date +%Y%m%d_%H%M%S)"
echo "[+] Creating pre-restore snapshot of current files in ${PRE_RESTORE_DIR}..."
mkdir -p "${PRE_RESTORE_DIR}"
if [ -d "data" ]; then cp -r data "${PRE_RESTORE_DIR}/"; fi
if [ -d "uploads" ]; then cp -r uploads "${PRE_RESTORE_DIR}/"; fi

# 8. Extract the selected backup archive
echo "[+] Extracting backup archive into ${PROJECT_DIR}..."
tar -xzf "${TARGET_ARCHIVE}" -C "${PROJECT_DIR}"

# 9. Ensure directory permissions match Node.js container user (UID 1000)
echo "[+] Setting storage permissions for node user (UID 1000)..."
if [ "$(id -u)" -eq 0 ]; then
  chown -R 1000:1000 data uploads
else
  echo "[!] Note: If permissions issues occur, run: sudo chown -R 1000:1000 data uploads"
fi

# 10. Restart application container
echo "[+] Restarting application container..."
if command -v docker &>/dev/null && docker compose version &>/dev/null; then
  docker compose up -d

  # 11. Verify healthcheck after restore
  echo "[+] Waiting for application healthcheck on http://127.0.0.1:3000/api/health..."
  MAX_ATTEMPTS=20
  ATTEMPT=1
  RESTORED_OK=false

  while [ "${ATTEMPT}" -le "${MAX_ATTEMPTS}" ]; do
    if curl -sf http://127.0.0.1:3000/api/health > /dev/null 2>&1; then
      RESTORED_OK=true
      break
    fi
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
  done

  if [ "${RESTORED_OK}" = true ]; then
    echo "[+] SUCCESS: Application is healthy and responding with HTTP 200 after restore!"
  else
    echo "[-] ERROR: Application did not pass health check after restore. Check logs with 'docker compose logs'."
    exit 1
  fi
fi

echo "============================================================"
echo " Restore completed successfully at $(date -Is)!"
echo " A safety pre-restore backup was saved in: ${PRE_RESTORE_DIR}"
echo "============================================================"
