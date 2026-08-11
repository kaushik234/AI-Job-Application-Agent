#!/bin/sh

# Set error handling
set -e

# Define directories (dynamic for Docker vs Host execution)
if [ -d "/app" ] && [ -w "/app" ]; then
    BACKUP_DIR="/app/data/backups"
    LOCAL_DATA_DIR="/app/data"
else
    BACKUP_DIR="./data/backups"
    LOCAL_DATA_DIR="./data"
fi
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "[$(date)] Starting Sentinel AI automated backup..."

# Create backup directory if it does not exist
mkdir -p "$BACKUP_DIR"

# 1. Backup Local JSON Database File if exists
if [ -f "$LOCAL_DATA_DIR/ai_job_agent.json" ]; then
    echo "[$(date)] Backing up local JSON Database File..."
    tar -czf "$BACKUP_DIR/local_db_$TIMESTAMP.tar.gz" -C "$LOCAL_DATA_DIR" ai_job_agent.json
    echo "[$(date)] Local database backup saved to local_db_$TIMESTAMP.tar.gz"
fi

# 2. Backup PostgreSQL Database if pg_dump is available and configs are set
if command -v pg_dump >/dev/null 2>&1; then
    if [ -n "$POSTGRES_DB" ] && [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ]; then
        echo "[$(date)] Backing up PostgreSQL Database ($POSTGRES_DB)..."
        PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h "${POSTGRES_HOST:-localhost}" -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_DIR/postgres_$POSTGRES_DB_$TIMESTAMP.sql.gz"
        echo "[$(date)] PostgreSQL database backup saved to postgres_$POSTGRES_DB_$TIMESTAMP.sql.gz"
    fi
else
    echo "[$(date)] pg_dump not installed. Skipping PostgreSQL backup."
fi

# 3. Rotate backups (Keep last 7 days of archives, delete older ones)
echo "[$(date)] Checking rotation policy (deleting archives older than 7 days)..."
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +7 -delete
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -delete

echo "[$(date)] Backup and rotation complete successfully."
