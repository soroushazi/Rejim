from decimal import Decimal

NUTRIENT_FIELDS = (
    "calories",
    "protein_g",
    "carbs_g",
    "fat_g",
    "fiber_g",
    "sugar_g",
    "sodium_mg",
    "potassium_mg",
    "calcium_mg",
    "iron_mg",
    "vitamin_c_mg",
    "vitamin_a_mcg",
)


def scale_nutrients(food_item, weight_grams):
    """Scale a FoodItem's per-100g nutrient values to an actual consumed weight."""
    factor = Decimal(str(weight_grams)) / Decimal(100)
    scaled = {}
    for field in NUTRIENT_FIELDS:
        per_100g = getattr(food_item, f"{field}_per_100g")
        scaled[field] = Decimal(str(per_100g)) * factor if per_100g is not None else None
    return scaled


def sum_nutrients(nutrient_dicts):
    """Sum a list of NUTRIENT_FIELDS dicts. A field stays None only if every input
    for it was None (e.g. no item in the group has micronutrient data)."""
    totals = {field: None for field in NUTRIENT_FIELDS}
    for d in nutrient_dicts:
        for field in NUTRIENT_FIELDS:
            value = d.get(field)
            if value is not None:
                totals[field] = (totals[field] or Decimal("0")) + value
    return totals


def average_nutrients(nutrient_dicts):
    """Mean of a list of NUTRIENT_FIELDS dicts (e.g. a meal's options, each an
    alternative - not summed together since a trainee picks only one)."""
    count = len(nutrient_dicts)
    if count == 0:
        return {field: None for field in NUTRIENT_FIELDS}
    totals = sum_nutrients(nutrient_dicts)
    return {field: (value / count if value is not None else None) for field, value in totals.items()}
