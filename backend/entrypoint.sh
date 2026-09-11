#!/bin/sh
set -e

if [ -n "$POSTGRES_DB" ]; then
  echo "Waiting for Postgres at ${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432}..."
  until pg_isready -h "${POSTGRES_HOST:-db}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}" -q; do
    sleep 1
  done
  echo "Postgres is up."
fi

python manage.py migrate --noinput

exec gunicorn config.wsgi:application --bind 0.0.0.0:8001 --workers 3
