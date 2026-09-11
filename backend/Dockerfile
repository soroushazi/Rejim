FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# libpq5 is the runtime lib psycopg[binary] needs; postgresql-client gives us
# pg_isready for entrypoint.sh's wait-for-db loop.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Runs against the dev-fallback settings (no real secrets needed for this
# step) - just needs SOMETHING in every env.get(..., default) slot, which
# settings.py already provides.
RUN python manage.py collectstatic --noinput

RUN chmod +x entrypoint.sh

EXPOSE 8001
ENTRYPOINT ["./entrypoint.sh"]
