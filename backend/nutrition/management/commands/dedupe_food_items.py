"""One-time/occasional cleanup: the bulk USDA import (import_usda_bulk_csv) can leave
duplicate FoodItem rows - the same food re-appearing under multiple fdc_ids (e.g. the
same product scraped into more than one USDA data_type, or genuinely re-submitted
branded data) with an identical name and identical calories_per_100g.

Deliberately narrow for a first pass: only source=usda rows (seeded/trainer-authored
items are curated by hand, not a bulk-import artifact) and only an exact name +
calories_per_100g match - not a fuzzy/near-duplicate pass. Keeps the earliest-imported
(lowest id) row of each duplicate group, deletes the rest.

A duplicate already referenced by a trainer's plan (ReferenceMealItem) or a trainee's
log (FoodLog) is left alone rather than deleted out from under real data - both are
on_delete=PROTECT, so Django refuses the delete; this command catches that per row and
reports it as skipped instead of crashing the whole batch.

Usage: manage.py dedupe_food_items [--dry-run]
"""

from django.core.management.base import BaseCommand
from django.db.models import Count, Min, ProtectedError

from nutrition.models import FoodItem


class Command(BaseCommand):
    help = "Remove duplicate USDA-sourced FoodItems (same name + calories_per_100g), keeping the earliest-imported row."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Report counts only, delete nothing.")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        base = FoodItem.objects.filter(source=FoodItem.Source.USDA)

        groups = (
            base.values("name", "calories_per_100g")
            .annotate(count=Count("id"), keep_id=Min("id"))
            .filter(count__gt=1)
        )

        group_count = 0
        deleted = 0
        skipped_protected = 0

        for group in groups.iterator():
            group_count += 1
            duplicate_ids = (
                base.filter(name=group["name"], calories_per_100g=group["calories_per_100g"])
                .exclude(id=group["keep_id"])
                .values_list("id", flat=True)
            )

            for item_id in duplicate_ids:
                if dry_run:
                    deleted += 1
                    continue
                try:
                    FoodItem(pk=item_id).delete()
                    deleted += 1
                except ProtectedError:
                    skipped_protected += 1

        self.stdout.write(self.style.SUCCESS(f"{'[DRY RUN] ' if dry_run else ''}Done."))
        self.stdout.write(f"  duplicate groups found: {group_count}")
        self.stdout.write(f"  {'would delete' if dry_run else 'deleted'}: {deleted}")
        if not dry_run:
            self.stdout.write(f"  skipped (referenced by a plan or log, protected): {skipped_protected}")
