#!/usr/bin/env bash
# Dumps the production Postgres database to a timestamped, gzipped file on
# local disk, prunes local backups past the retention window, and - only
# when run with --upload - also uploads that same dump off the box entirely,
# to Oracle Object Storage via a pre-authenticated request URL (no OCI CLI
# or credentials file needed - see BACKUP_PAR_URL below).
#
# Mirrors the AllIn app's backup_db.sh on the same Oracle instance -
# same design (local daily safety net + weekly off-box copy), adapted for
# Rejim's compose file/service names and dataset size.
#
# One-time setup on the Oracle box, after `git pull`:
#   chmod +x scripts/backup_db.sh scripts/restore_db.sh
#   crontab -e
# Then add both lines (daily local safety net, weekly off-box copy too):
#   0 3 * * *   cd /path/to/Rejim && ./scripts/backup_db.sh          >> ~/rejim-backups/backup.log 2>&1
#   0 3 * * 0   cd /path/to/Rejim && ./scripts/backup_db.sh --upload >> ~/rejim-backups/backup.log 2>&1
# (Sunday's run passes --upload, so that day gets both the local dump and
# the off-box copy - no need for a third cron line.)
#
# To enable --upload: create an Object Storage bucket in the OCI console
# (Always Free tier) - use a separate bucket from AllIn's (e.g.
# rejim-db-backups), since these are unrelated apps and a leaked PAR for
# one shouldn't touch the other's backups. On that bucket, create a
# Pre-Authenticated Request with Access Type "Permit object writes" and a
# far-future expiration. Paste the resulting URL into .env.prod as
# BACKUP_PAR_URL (quoted, no angle brackets). A write-only PAR can add
# backups but can't list, read, or delete them - so even if the URL ever
# leaked, it couldn't be used to read or wipe existing backups.

set -euo pipefail
cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-$HOME/rejim-backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
COMPOSE="docker compose -f docker-compose.prod.yml"

mkdir -p "$BACKUP_DIR"
timestamp="$(date +%Y-%m-%d-%H%M%S)"
dump_file="$BACKUP_DIR/rejim-$timestamp.sql.gz"

# --clean --if-exists so the dump drops existing tables before recreating
# them - makes restore_db.sh safe to run against a non-empty database too,
# not just a freshly-migrated one.
$COMPOSE exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" --clean --if-exists "$POSTGRES_DB"' | gzip > "$dump_file"
echo "$(date -Iseconds) backed up to $dump_file ($(du -h "$dump_file" | cut -f1))"

find "$BACKUP_DIR" -maxdepth 1 -name 'rejim-*.sql.gz' -mtime "+$RETENTION_DAYS" -print -delete

if [[ "${1:-}" == "--upload" ]]; then
  set -a
  # shellcheck disable=SC1091
  [[ -f .env.prod ]] && source .env.prod
  set +a
  if [[ -z "${BACKUP_PAR_URL:-}" ]]; then
    echo "$(date -Iseconds) --upload requested but BACKUP_PAR_URL isn't set in .env.prod - skipping off-box copy." >&2
    exit 1
  fi
  curl -sf -X PUT --data-binary "@$dump_file" "$BACKUP_PAR_URL/$(basename "$dump_file")"
  echo "$(date -Iseconds) uploaded $(basename "$dump_file") to Object Storage"
fi
