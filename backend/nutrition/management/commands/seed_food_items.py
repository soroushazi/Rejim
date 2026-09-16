import csv
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from nutrition.models import FoodItem, FoodItemMeasure

# Maps FoodItem field name -> column name in ingredient_nutrition_reference.csv.
# The CSV is per-100g for every row (see its serving_basis column).
CSV_FIELD_MAP = {
    "calories_per_100g": "calories_kcal",
    "protein_g_per_100g": "protein_g",
    "carbs_g_per_100g": "carbs_g",
    "fat_g_per_100g": "fat_g",
    "fiber_g_per_100g": "fiber_g",
    "sugar_g_per_100g": "sugar_g",
    "sodium_mg_per_100g": "sodium_mg",
    "potassium_mg_per_100g": "potassium_mg",
    "calcium_mg_per_100g": "calcium_mg",
    "iron_mg_per_100g": "iron_mg",
    "vitamin_c_mg_per_100g": "vitamin_c_mg",
    "vitamin_a_mcg_per_100g": "vitamin_a_mcg_rae",
}

CSV_PATH = Path(settings.BASE_DIR) / "ingredient_nutrition_reference.csv"
MEASURES_CSV_PATH = Path(settings.BASE_DIR) / "ingredient_measures.csv"


class Command(BaseCommand):
    help = (
        "Seed the FoodItem reference table from ingredient_nutrition_reference.csv, "
        "and each item's loggable measures from ingredient_measures.csv."
    )

    def handle(self, *args, **options):
        if not CSV_PATH.exists():
            raise CommandError(f"CSV not found at {CSV_PATH}")

        created_count = 0
        updated_count = 0
        with CSV_PATH.open(newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                name = row["ingredient"].strip()
                defaults = {field: row[column] for field, column in CSV_FIELD_MAP.items()}
                defaults["source"] = FoodItem.Source.SEEDED
                _, created = FoodItem.objects.update_or_create(name=name, defaults=defaults)
                created_count += created
                updated_count += not created

        self.stdout.write(
            self.style.SUCCESS(f"Seeded FoodItems: {created_count} created, {updated_count} updated.")
        )

        if not MEASURES_CSV_PATH.exists():
            return

        measures_by_ingredient = {}
        with MEASURES_CSV_PATH.open(newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                name = row["ingredient"].strip()
                measures_by_ingredient.setdefault(name, []).append(row)

        measure_count = 0
        for name, rows in measures_by_ingredient.items():
            try:
                food_item = FoodItem.objects.get(name=name)
            except FoodItem.DoesNotExist:
                self.stderr.write(f"Skipping measures for unknown ingredient '{name}'.")
                continue
            seen_labels = set()
            for row in rows:
                label = row["unit_label"].strip()
                seen_labels.add(label)
                FoodItemMeasure.objects.update_or_create(
                    food_item=food_item,
                    label=label,
                    defaults={
                        "grams_per_unit": row["grams_per_unit"].strip(),
                        "is_default": row["is_default"].strip().lower() == "true",
                    },
                )
                measure_count += 1
            # Drop any measure no longer present for this ingredient in the CSV, so
            # re-running the seed after editing the CSV doesn't leave stale rows.
            food_item.measures.exclude(label__in=seen_labels).delete()

        self.stdout.write(self.style.SUCCESS(f"Seeded {measure_count} FoodItemMeasures."))
