from decimal import Decimal

NUTRIENT_FIELDS = (
    "calories",
    "protein_g",
    "carbs_g",
    "fat_g",
    "fiber_g",
    "sugar_g",
    "sodium_mg",
)


def scale_nutrients(food_item, weight_grams):
    """Scale a FoodItem's per-100g nutrient values to an actual consumed weight."""
    factor = Decimal(str(weight_grams)) / Decimal(100)
    scaled = {}
    for field in NUTRIENT_FIELDS:
        per_100g = getattr(food_item, f"{field}_per_100g")
        scaled[field] = Decimal(str(per_100g)) * factor if per_100g is not None else None
    return scaled
