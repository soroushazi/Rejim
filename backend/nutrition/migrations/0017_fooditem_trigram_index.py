from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.operations import TrigramExtension
from django.db import migrations


class AddIndexIfPostgres(migrations.AddIndex):
    """Same as AddIndex, but the actual DDL only runs on Postgres - SQLite can't parse
    "CREATE INDEX ... USING gin (...)". Deliberately NOT achieved by making the whole
    operations list conditional on connection.vendor at migration-import time (an
    earlier version of this migration did that): migration *state* is meant to be
    backend-independent, so a vendor-conditional operations list makes the model state
    Django reconstructs from migration history depend on whichever database happens to
    be connected when the state gets built - on Postgres it includes these indexes, on
    SQLite it doesn't, while FoodItem.Meta.indexes (models.py) declares them
    unconditionally. That mismatch is exactly what made makemigrations' autodetector
    propose removing them on Postgres (see CLAUDE.md / this migration's git history).
    Overriding only database_forwards/backwards (not state_forwards) keeps migration
    state identical on every backend - matching Meta.indexes everywhere - while still
    skipping the real CREATE INDEX on a backend that can't run it."""

    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        if schema_editor.connection.vendor != "postgresql":
            return
        super().database_forwards(app_label, schema_editor, from_state, to_state)

    def database_backwards(self, app_label, schema_editor, from_state, to_state):
        if schema_editor.connection.vendor != "postgresql":
            return
        super().database_backwards(app_label, schema_editor, from_state, to_state)


class Migration(migrations.Migration):
    dependencies = [
        ("nutrition", "0016_fooditem_brand_name_and_more"),
    ]

    # TrigramExtension already self-skips on non-Postgres (checks connection.vendor
    # inside its own database_forwards) - safe to apply unconditionally here too.
    operations = [
        TrigramExtension(),
        AddIndexIfPostgres(
            model_name="fooditem",
            index=GinIndex(fields=["name"], name="fooditem_name_trgm_gin", opclasses=["gin_trgm_ops"]),
        ),
        AddIndexIfPostgres(
            model_name="fooditem",
            index=GinIndex(fields=["brand_name"], name="fooditem_brand_trgm_gin", opclasses=["gin_trgm_ops"]),
        ),
    ]
