from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.operations import TrigramExtension
from django.db import connection, migrations

# GinIndex (unlike TrigramExtension, which self-skips on non-Postgres backends) sends
# literal "CREATE INDEX ... USING gin (...)" SQL straight to whatever's connected, which
# SQLite can't parse - so these operations are only included when actually running
# against Postgres. Local dev (SQLite) gets an empty, no-op migration.
postgres_only_operations = [
    TrigramExtension(),
    migrations.AddIndex(
        model_name="fooditem",
        index=GinIndex(fields=["name"], name="fooditem_name_trgm_gin", opclasses=["gin_trgm_ops"]),
    ),
    migrations.AddIndex(
        model_name="fooditem",
        index=GinIndex(fields=["brand_name"], name="fooditem_brand_trgm_gin", opclasses=["gin_trgm_ops"]),
    ),
]


class Migration(migrations.Migration):
    dependencies = [
        ("nutrition", "0016_fooditem_brand_name_and_more"),
    ]

    operations = postgres_only_operations if connection.vendor == "postgresql" else []
