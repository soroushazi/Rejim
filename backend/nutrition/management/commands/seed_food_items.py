import csv
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from nutrition.models import FoodItem

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

CSV_PATH = Path(settings.BASE_DIR).parent / "ingredient_nutrition_reference.csv"


class Command(BaseCommand):
    help = "Seed the FoodItem reference table from ingredient_nutrition_reference.csv."

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
