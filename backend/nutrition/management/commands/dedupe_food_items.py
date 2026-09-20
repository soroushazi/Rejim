"""One-time/occasional cleanup: the bulk USDA import (import_usda_bulk_csv) can leave
duplicate FoodItem rows - the same food re-appearing under multiple fdc_ids (e.g. the
same product scraped into more than one USDA data_type, or genuinely re-submitted
branded data) with an identical name and identical calories_per_100g.

Deliberately narrow for a first pass: only source=usda rows (seeded/trainer-authored
items are curated by hand, not a bulk-import artifact) and only an exact name +
calories_per_100g match - not a fuzzy/near-duplicate pass. Keeps the earliest-imported
(lowest id) row of each duplicate group, deletes the rest.

Finding the duplicates is a single ROW_NUMBER() OVER (PARTITION BY name,
calories_per_100g ORDER BY id) window query, not a per-group SELECT loop - at
USDA-bulk-import scale (~2M rows, no btree index on name/calories_per_100g, only the
trigram GIN index used for substring search) a query-per-duplicate-group approach does
one large-ish scan per group and can run for many hours. A single window-function pass
does one scan total, and works on both Postgres (prod) and SQLite (dev) since both
support ROW_NUMBER().

Deletes are still batched (--batch-size) so a run has visible progress and doesn't hold
one massive transaction. A duplicate already referenced by a trainer's plan
(ReferenceMealItem) or a trainee's log (FoodLog) is left alone rather than deleted out
from under real data - both are on_delete=PROTECT; a batch containing one falls back to
deleting that batch row-by-row so the rest of the batch still goes through, and the
protected row is reported as skipped instead of crashing the run.

Usage: manage.py dedupe_food_items [--dry-run] [--batch-size N]
"""

from django.core.management.base import BaseCommand
from django.db import connection
from django.db.models import ProtectedError

from nutrition.models import FoodItem


class Command(BaseCommand):
    help = "Remove duplicate USDA-sourced FoodItems (same name + calories_per_100g), keeping the earliest-imported row."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Report counts only, delete nothing.")
        parser.add_argument(
            "--batch-size",
            type=int,
            default=2000,
            help="Rows per delete batch (progress is printed after each batch). Ignored for --dry-run.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        batch_size = options["batch_size"]

        self.stdout.write("Scanning for duplicate USDA FoodItems (single pass)...")
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (
                        PARTITION BY name, calories_per_100g ORDER BY id
                    ) AS rn
                    FROM nutrition_fooditem
                    WHERE source = %s
                ) ranked
                WHERE rn > 1
                ORDER BY id
                """,
                [FoodItem.Source.USDA],
            )
            duplicate_ids = [row[0] for row in cursor.fetchall()]

        total = len(duplicate_ids)
        prefix = "[DRY RUN] " if dry_run else ""

        if dry_run or total == 0:
            self.stdout.write(self.style.SUCCESS(f"{prefix}Done."))
            self.stdout.write(f"  duplicate rows found: {total}")
            return

        deleted = 0
        skipped_protected = 0
        for start in range(0, total, batch_size):
            batch = duplicate_ids[start : start + batch_size]
            try:
                _, details = FoodItem.objects.filter(id__in=batch).delete()
                deleted += details.get(FoodItem._meta.label, 0)
            except ProtectedError:
                for item_id in batch:
                    try:
                        FoodItem(pk=item_id).delete()
                        deleted += 1
                    except ProtectedError:
                        skipped_protected += 1
            self.stdout.write(f"  progress: {min(start + batch_size, total)}/{total}")

        self.stdout.write(self.style.SUCCESS("Done."))
        self.stdout.write(f"  duplicate rows found: {total}")
        self.stdout.write(f"  deleted: {deleted}")
        self.stdout.write(f"  skipped (referenced by a plan or log, protected): {skipped_protected}")
