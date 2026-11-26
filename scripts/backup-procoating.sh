#!/bin/bash
set -euo pipefail

TIMESTAMP=$(date +"%Y-%m-%d_%H%M")
BACKUP_ROOT="/var/backups/procoating"
STAGE_DIR="/tmp/ProCoating_FULL_Backup_${TIMESTAMP}"
ARCHIVE_NAME="ProCoating_FULL_Backup_${TIMESTAMP}.tar.gz"
ARCHIVE_PATH="${BACKUP_ROOT}/${ARCHIVE_NAME}"

mkdir -p "${BACKUP_ROOT}" "${STAGE_DIR}/1_database" "${STAGE_DIR}/2_backend" "${STAGE_DIR}/3_frontend"

# 1. Base de datos completa: estructura (DDL) + datos en SQL plano y binario
sudo -u postgres pg_dump --clean --if-exists --no-owner --no-privileges -Fp procoatingdb > "${STAGE_DIR}/1_database/procoatingdb_schema_and_data_${TIMESTAMP}.sql"
sudo -u postgres pg_dump -Fc procoatingdb > "${STAGE_DIR}/1_database/procoatingdb_binary_${TIMESTAMP}.dump"

# 2. Backend completo (código, rutas, .env, scripts y uploads sin node_modules)
tar --exclude='node_modules' --exclude='*.log' -cf - -C /root/procoating-app . | tar -xf - -C "${STAGE_DIR}/2_backend"

# 3. Frontend completo (index.html, js/, assets/ y fotos en uploads/)
tar -cf - -C /var/www/procoating . | tar -xf - -C "${STAGE_DIR}/3_frontend"

# 4. Guía rápida de restauración incluida en el paquete
cat << 'RESTORE_EOF' > "${STAGE_DIR}/RESTORE_README.txt"
PRO-Coating Treatments Inc. - Full System Backup
================================================
1. Database Restore (SQL):
   sudo -u postgres psql -d procoatingdb -f 1_database/procoatingdb_schema_and_data_*.sql
   (Or binary format: sudo -u postgres pg_restore --clean --if-exists -d procoatingdb 1_database/procoatingdb_binary_*.dump)

2. Backend Restore:
   cp -r 2_backend/* /root/procoating-app/
   cd /root/procoating-app/backend && npm install --production && pm2 restart procoating-backend

3. Frontend Restore:
   cp -r 3_frontend/* /var/www/procoating/
RESTORE_EOF

# 5. Empaquetar en un único .tar.gz y limpiar temporales
tar -czf "${ARCHIVE_PATH}" -C /tmp "ProCoating_FULL_Backup_${TIMESTAMP}"
rm -rf "${STAGE_DIR}"

# 6. Retención local de 14 días
find "${BACKUP_ROOT}" -type f -name "ProCoating_FULL_Backup_*.tar.gz" -mtime +14 -delete

# 7. Subida automática a Google Drive (alexelgordo@gmail.com)
if command -v rclone >/dev/null 2>&1 && sudo rclone listremotes | grep -q '^gdrive_procoating:'; then
  sudo rclone copy "${ARCHIVE_PATH}" gdrive_procoating:ProCoating-Backups/ --progress
fi

echo "BACKUP_OK=${ARCHIVE_PATH}"
