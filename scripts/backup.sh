#!/usr/bin/env bash
# ==============================================================================
# HOTEL CONTRACT MANAGER - PRODUCTION BACKUP SCRIPT
# Creates an atomic compressed archive of data/ and uploads/ with SHA256 checksum.
# Retains local daily backups for 14 days.
# ==============================================================================
set -euo pipefail

# 1. Determine project directory safely
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_DIR}"

# 2. Configure backup destination and timestamp
BACKUP_DIR="${BACKUP_DIR:-/var/backups/hotel-contracts}"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
ARCHIVE_FILENAME="contracts_backup_${TIMESTAMP}.tar.gz"
ARCHIVE_PATH="${BACKUP_DIR}/${ARCHIVE_FILENAME}"
CHECKSUM_PATH="${ARCHIVE_PATH}.sha256"

echo "============================================================"
echo " Starting Hotel Contract Manager Backup"
echo " Time: $(date -Is)"
echo " Destination: ${ARCHIVE_PATH}"
echo "============================================================"

# 3. Create destination directory if not existing
mkdir -p "${BACKUP_DIR}"

# 4. Verify data directories exist before archiving
if [ ! -d "data" ] && [ ! -d "uploads" ]; then
  echo "[-] ERROR: Neither 'data/' nor 'uploads/' directory was found in ${PROJECT_DIR}."
  exit 1
fi

# 5. Create compressed archive excluding temporary write files and corruption backups
echo "[+] Creating archive from ${PROJECT_DIR}..."
tar -czf "${ARCHIVE_PATH}" \
  -C "${PROJECT_DIR}" \
  --exclude="*.tmp" \
  --exclude="*.bak" \
  --exclude="data/*.bak" \
  --exclude="uploads/*.tmp" \
  data/ uploads/

# 6. Generate SHA256 checksum for backup integrity verification
echo "[+] Generating SHA256 checksum..."
sha256sum "${ARCHIVE_PATH}" > "${CHECKSUM_PATH}"

# 7. Verify the archive can be read
echo "[+] Verifying archive structure..."
tar -tzf "${ARCHIVE_PATH}" > /dev/null

ARCHIVE_SIZE="$(du -h "${ARCHIVE_PATH}" | cut -f1)"
echo "[+] SUCCESS: Backup archive created (${ARCHIVE_SIZE}):"
echo "    Archive:  ${ARCHIVE_PATH}"
echo "    Checksum: ${CHECKSUM_PATH}"

# 8. Retention cleanup: Remove local backups older than 14 days matching this application only
echo "[+] Cleaning up local archives older than 14 days..."
find "${BACKUP_DIR}" -maxdepth 1 -type f -name "contracts_backup_*.tar.gz" -mtime +14 -delete
find "${BACKUP_DIR}" -maxdepth 1 -type f -name "contracts_backup_*.tar.gz.sha256" -mtime +14 -delete

echo "============================================================"
echo " Backup completed successfully at $(date -Is)!"
echo "============================================================"
