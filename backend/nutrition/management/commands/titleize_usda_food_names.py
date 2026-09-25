"""One-time backfill: normalize existing source=usda FoodItem names that came in as
ALL CAPS (typical of USDA's Branded Foods descriptions, as printed on packaging) to
Title Case. Only reformats a name that's currently all-caps - leaves anything already
mixed-case (e.g. Foundation/SR Legacy's own readable descriptions) untouched.

New imports no longer need this: import_usda_food.py (via usda_client.normalize_usda_name)
and import_usda_bulk_csv.py (its own INITCAP, same gate) both normalize at import time
now - this command only catches rows imported before that existed.

Postgres: a single INITCAP() UPDATE - one pass over the (potentially ~2M-row) USDA
catalog, same "one scan, not one query per row" reasoning as dedupe_food_items.py.
SQLite (dev): only a handful of source=usda rows ever exist there (import_usda_food is
the only importer that runs there - import_usda_bulk_csv is Postgres-only), so a plain
Python loop reusing normalize_usda_name is simple and plenty fast.

Usage: manage.py titleize_usda_food_names [--dry-run]
"""

from django.core.management.base import BaseCommand
from django.db import connection

from nutrition.models import FoodItem
from nutrition.usda_client import normalize_usda_name


class Command(BaseCommand):
    help = "Title-case any USDA-sourced FoodItem name that's currently all-caps."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Report the count only, change nothing.")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        prefix = "[DRY RUN] " if dry_run else ""

        updated = self._update_postgres(dry_run) if connection.vendor == "postgresql" else self._update_python(dry_run)

        self.stdout.write(self.style.SUCCESS(f"{prefix}Done."))
        self.stdout.write(f"  names title-cased: {updated}")

    def _update_postgres(self, dry_run):
        with connection.cursor() as cursor:
            if dry_run:
                cursor.execute(
                    "SELECT COUNT(*) FROM nutrition_fooditem WHERE source = %s AND name = UPPER(name)",
                    [FoodItem.Source.USDA],
                )
                return cursor.fetchone()[0]
            cursor.execute(
                "UPDATE nutrition_fooditem SET name = INITCAP(name) WHERE source = %s AND name = UPPER(name)",
                [FoodItem.Source.USDA],
            )
            return cursor.rowcount

    def _update_python(self, dry_run):
        changed = []
        for item in FoodItem.objects.filter(source=FoodItem.Source.USDA).only("id", "name"):
            normalized = normalize_usda_name(item.name)
            if normalized != item.name:
                item.name = normalized
                changed.append(item)
        if not dry_run and changed:
            FoodItem.objects.bulk_update(changed, ["name"], batch_size=2000)
        return len(changed)
