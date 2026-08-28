from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError

from accounts.models import User
from nutrition.models import DietPlan, FoodItem, MealOption, ReferenceMeal, ReferenceMealItem

# New reference items the sample plan needs that aren't already in
# ingredient_nutrition_reference.csv. Values are derived from diet_sample.xlsx's
# "Reference" sheet (given there as per-gram, multiplied out to per-100g here).
NEW_FOOD_ITEMS = {
    "Frozen mixed berries": dict(
        calories_per_100g="55", protein_g_per_100g="1", carbs_g_per_100g="13",
        fat_g_per_100g="0", fiber_g_per_100g="2",
    ),
    "Whole milk (3.25% fat)": dict(
        calories_per_100g="61", protein_g_per_100g="3", carbs_g_per_100g="5",
        fat_g_per_100g="3", fiber_g_per_100g="0",
    ),
    "Jocko protein powder": dict(
        calories_per_100g="353", protein_g_per_100g="65", carbs_g_per_100g="15",
        fat_g_per_100g="7", fiber_g_per_100g="0",
    ),
    "Dry oats": dict(
        calories_per_100g="390", protein_g_per_100g="17", carbs_g_per_100g="66",
        fat_g_per_100g="7", fiber_g_per_100g="10",
    ),
    "Non-fat Greek yogurt": dict(
        calories_per_100g="59", protein_g_per_100g="10", carbs_g_per_100g="4",
        fat_g_per_100g="0", fiber_g_per_100g="0",
    ),
    # Sheet gives this per-egg (72 kcal/egg); a large egg is ~50g raw.
    "Whole eggs": dict(
        calories_per_100g="144", protein_g_per_100g="12.6", carbs_g_per_100g="0.8",
        fat_g_per_100g="9.6", fiber_g_per_100g="0",
        serving_unit=FoodItem.ServingUnit.EACH, serving_size_grams="50",
    ),
    # Sheet gives this per-serving with no gram weight; ~150g assumed for a side salad.
    "Mixed salad (Lettuce, Tomato, Cucumber, Lemon)": dict(
        calories_per_100g="26.67", protein_g_per_100g="1.33", carbs_g_per_100g="6",
        fat_g_per_100g="0.33", fiber_g_per_100g="1.33",
        serving_unit=FoodItem.ServingUnit.SERVING, serving_size_grams="150",
    ),
    "Shrimp (Raw)": dict(
        calories_per_100g="99", protein_g_per_100g="24", carbs_g_per_100g="0",
        fat_g_per_100g="0.3", fiber_g_per_100g="0",
    ),
    "93% lean ground beef (Raw)": dict(
        calories_per_100g="172", protein_g_per_100g="25", carbs_g_per_100g="0",
        fat_g_per_100g="8", fiber_g_per_100g="0",
    ),
    "Cod (Raw)": dict(
        calories_per_100g="82", protein_g_per_100g="18", carbs_g_per_100g="0",
        fat_g_per_100g="0.7", fiber_g_per_100g="0",
    ),
    "Top sirloin steak (Raw)": dict(
        calories_per_100g="130", protein_g_per_100g="22", carbs_g_per_100g="0",
        fat_g_per_100g="5", fiber_g_per_100g="0",
    ),
}

# Ingredient names as they appear in diet_sample.xlsx -> the name already seeded from
# ingredient_nutrition_reference.csv (same food, just phrased differently).
REUSED_FOOD_ITEMS = {
    "Banana": "Banana",
    "Spinach (Raw)": "Spinach (raw)",
    "Blueberries": "Blueberries",
    "Whole wheat bread": "Whole wheat bread",
    "Avocado": "Avocado",
    "Chicken breast (Raw)": "Chicken breast (raw)",
    "Olive oil": "Olive oil",
    "Jasmine rice (Uncooked)": "Jasmine rice (uncooked)",
    "Salmon (Raw)": "Salmon (raw)",
    "Peanut butter": "Peanut butter",
    "Almonds": "Almonds",
    "Raw sweet potato": "Sweet potato (raw)",
}

# (meal label, meal order, [(option label, option order, [(ingredient, grams), ...]), ...])
# Meal order reserves a slot per possible daily meal (0=Breakfast, 1=Morning Snack,
# 2=Lunch, 3=Afternoon Snack, 4=Dinner, 5=Evening Snack) even though this sample only
# fills 4 of them - trainers can add meals into the unused slots later.
MEAL_PLAN = [
    ("Breakfast", 0, [
        ("Smoothie", 0, [
            ("Frozen mixed berries", "120"),
            ("Banana", "120"),
            ("Whole milk (3.25% fat)", "400"),
            ("Jocko protein powder", "45"),
            ("Spinach (Raw)", "30"),
        ]),
        ("Overnight Oats", 1, [
            ("Dry oats", "80"),
            ("Whole milk (3.25% fat)", "150"),
            ("Non-fat Greek yogurt", "150"),
            ("Banana", "80"),
            ("Blueberries", "40"),
            ("Jocko protein powder", "15"),
        ]),
        ("Eggs & Toast", 2, [
            ("Whole eggs", "200"),
            ("Whole wheat bread", "40"),
            ("Avocado", "120"),
        ]),
    ]),
    ("Lunch", 2, [
        ("Chicken & Sweet Potato", 0, [
            ("Chicken breast (Raw)", "260"),
            ("Raw sweet potato", "220"),
            ("Mixed salad (Lettuce, Tomato, Cucumber, Lemon)", "150"),
            ("Avocado", "40"),
            ("Olive oil", "8"),
        ]),
        ("Shrimp & Rice", 1, [
            ("Shrimp (Raw)", "320"),
            ("Jasmine rice (Uncooked)", "70"),
            ("Mixed salad (Lettuce, Tomato, Cucumber, Lemon)", "150"),
            ("Avocado", "35"),
            ("Non-fat Greek yogurt", "35"),
        ]),
        ("Ground Beef & Sweet Potato", 2, [
            ("93% lean ground beef (Raw)", "240"),
            ("Raw sweet potato", "200"),
            ("Mixed salad (Lettuce, Tomato, Cucumber, Lemon)", "150"),
            ("Non-fat Greek yogurt", "35"),
            ("Avocado", "35"),
        ]),
    ]),
    ("Afternoon Snack", 3, [
        ("Yogurt Bowl", 0, [
            ("Non-fat Greek yogurt", "350"),
            ("Banana", "100"),
            ("Peanut butter", "18"),
            ("Almonds", "12"),
            ("Blueberries", "25"),
        ]),
        ("Peanut Butter Toast", 1, [
            ("Whole wheat bread", "80"),
            ("Peanut butter", "28"),
            ("Banana", "100"),
        ]),
    ]),
    ("Dinner", 4, [
        ("Cod & Rice", 0, [
            ("Cod (Raw)", "350"),
            ("Jasmine rice (Uncooked)", "90"),
            ("Mixed salad (Lettuce, Tomato, Cucumber, Lemon)", "150"),
            ("Non-fat Greek yogurt", "25"),
            ("Avocado", "45"),
        ]),
        ("Salmon & Sweet Potato", 1, [
            ("Salmon (Raw)", "240"),
            ("Raw sweet potato", "180"),
            ("Mixed salad (Lettuce, Tomato, Cucumber, Lemon)", "150"),
            ("Non-fat Greek yogurt", "25"),
            ("Avocado", "20"),
        ]),
        ("Steak & Sweet Potato", 2, [
            ("Top sirloin steak (Raw)", "320"),
            ("Raw sweet potato", "260"),
            ("Mixed salad (Lettuce, Tomato, Cucumber, Lemon)", "150"),
            ("Non-fat Greek yogurt", "25"),
            ("Olive oil", "5"),
        ]),
    ]),
]

PLAN_NAME = "Sample Reference Plan"


class Command(BaseCommand):
    help = (
        "Seed a sample DietPlan for trainee1 (as if authored by trainer1), based on "
        "diet_sample.xlsx. Idempotent - rerunning replaces this plan's meals with a "
        "fresh copy."
    )

    def handle(self, *args, **options):
        try:
            trainee = User.objects.get(username="trainee1")
        except User.DoesNotExist:
            raise CommandError("trainee1 not found - this command expects the dev-only trainee1 user.")

        food_items = self._ensure_food_items()

        plan, _ = DietPlan.objects.get_or_create(trainee=trainee, name=PLAN_NAME)
        plan.meals.all().delete()

        for meal_label, meal_order, options in MEAL_PLAN:
            meal = ReferenceMeal.objects.create(diet_plan=plan, label=meal_label, order=meal_order)
            for option_label, option_order, items in options:
                option = MealOption.objects.create(meal=meal, label=option_label, order=option_order)
                for ingredient_name, grams in items:
                    ReferenceMealItem.objects.create(
                        option=option,
                        food_item=food_items[ingredient_name],
                        reference_weight_grams=Decimal(grams),
                    )

        self.stdout.write(self.style.SUCCESS(f"Seeded diet plan '{plan.name}' for {trainee.username}."))

    def _ensure_food_items(self):
        lookup = {}
        for sheet_name, defaults in NEW_FOOD_ITEMS.items():
            item, _ = FoodItem.objects.update_or_create(
                name=sheet_name, defaults={**defaults, "source": FoodItem.Source.SEEDED}
            )
            lookup[sheet_name] = item
        for sheet_name, existing_name in REUSED_FOOD_ITEMS.items():
            try:
                lookup[sheet_name] = FoodItem.objects.get(name__iexact=existing_name)
            except FoodItem.DoesNotExist:
                raise CommandError(
                    f"Expected existing FoodItem '{existing_name}' not found - run seed_food_items first."
                )
        return lookup
