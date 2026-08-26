from django.core.management.base import BaseCommand

from nutrition.models import FoodItem

# Per-100g values, from common public nutrition references. Stage 1 self-seeded
# table — a starting set covering typical trainer meal-plan ingredients.
# Fields not commonly listed (fiber/sugar/sodium) are left as None.
FOOD_ITEMS = [
    dict(name="Chicken Breast, cooked", calories_per_100g=165, protein_g_per_100g=31, carbs_g_per_100g=0, fat_g_per_100g=3.6, sodium_mg_per_100g=74),
    dict(name="Salmon, cooked", calories_per_100g=206, protein_g_per_100g=22, carbs_g_per_100g=0, fat_g_per_100g=13),
    dict(name="Tuna, canned in water", calories_per_100g=116, protein_g_per_100g=26, carbs_g_per_100g=0, fat_g_per_100g=0.8, sodium_mg_per_100g=247),
    dict(name="Egg, whole, cooked", calories_per_100g=155, protein_g_per_100g=13, carbs_g_per_100g=1.1, fat_g_per_100g=11, sodium_mg_per_100g=124),
    dict(name="Egg White, cooked", calories_per_100g=52, protein_g_per_100g=11, carbs_g_per_100g=0.7, fat_g_per_100g=0.2, sodium_mg_per_100g=166),
    dict(name="Greek Yogurt, plain, nonfat", calories_per_100g=59, protein_g_per_100g=10, carbs_g_per_100g=3.6, fat_g_per_100g=0.4, sugar_g_per_100g=3.6),
    dict(name="Milk, skim", calories_per_100g=34, protein_g_per_100g=3.4, carbs_g_per_100g=5, fat_g_per_100g=0.1, sugar_g_per_100g=5),
    dict(name="Whey Protein Powder", calories_per_100g=400, protein_g_per_100g=80, carbs_g_per_100g=8, fat_g_per_100g=6),
    dict(name="Brown Rice, cooked", calories_per_100g=112, protein_g_per_100g=2.6, carbs_g_per_100g=24, fat_g_per_100g=0.9, fiber_g_per_100g=1.8),
    dict(name="White Rice, cooked", calories_per_100g=130, protein_g_per_100g=2.7, carbs_g_per_100g=28, fat_g_per_100g=0.3, fiber_g_per_100g=0.4),
    dict(name="Oats, dry", calories_per_100g=389, protein_g_per_100g=17, carbs_g_per_100g=66, fat_g_per_100g=7, fiber_g_per_100g=10.6),
    dict(name="Sweet Potato, cooked", calories_per_100g=90, protein_g_per_100g=2, carbs_g_per_100g=21, fat_g_per_100g=0.1, fiber_g_per_100g=3.3),
    dict(name="Whole Wheat Bread", calories_per_100g=247, protein_g_per_100g=13, carbs_g_per_100g=41, fat_g_per_100g=3.4, fiber_g_per_100g=7, sodium_mg_per_100g=400),
    dict(name="Broccoli, cooked", calories_per_100g=35, protein_g_per_100g=2.4, carbs_g_per_100g=7.2, fat_g_per_100g=0.4, fiber_g_per_100g=3.3),
    dict(name="Banana", calories_per_100g=89, protein_g_per_100g=1.1, carbs_g_per_100g=23, fat_g_per_100g=0.3, fiber_g_per_100g=2.6, sugar_g_per_100g=12),
    dict(name="Apple", calories_per_100g=52, protein_g_per_100g=0.3, carbs_g_per_100g=14, fat_g_per_100g=0.2, fiber_g_per_100g=2.4, sugar_g_per_100g=10),
    dict(name="Almonds", calories_per_100g=579, protein_g_per_100g=21, carbs_g_per_100g=22, fat_g_per_100g=50, fiber_g_per_100g=12.5),
    dict(name="Peanut Butter", calories_per_100g=588, protein_g_per_100g=25, carbs_g_per_100g=20, fat_g_per_100g=50, fiber_g_per_100g=6, sodium_mg_per_100g=459),
    dict(name="Avocado", calories_per_100g=160, protein_g_per_100g=2, carbs_g_per_100g=9, fat_g_per_100g=15, fiber_g_per_100g=7),
    dict(name="Olive Oil", calories_per_100g=884, protein_g_per_100g=0, carbs_g_per_100g=0, fat_g_per_100g=100),
]


class Command(BaseCommand):
    help = "Seed the FoodItem reference table with a starting set of common ingredients."

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0
        for data in FOOD_ITEMS:
            name = data.pop("name")
            _, created = FoodItem.objects.update_or_create(
                name=name, defaults={**data, "source": FoodItem.Source.SEEDED}
            )
            created_count += created
            updated_count += not created
        self.stdout.write(
            self.style.SUCCESS(f"Seeded FoodItems: {created_count} created, {updated_count} updated.")
        )
