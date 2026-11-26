#!/bin/bash
STAMP=$(date +%Y-%m-%d_%H%M)
DEST="/var/backups/procoating"
mkdir -p "$DEST"
sudo -u postgres pg_dump -Fc procoatingdb > "$DEST/procoatingdb_${STAMP}.dump"
tar -czf "$DEST/procoating_uploads_${STAMP}.tar.gz" -C /var/www/procoating uploads
find "$DEST" -type f -mtime +14 -delete
