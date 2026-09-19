"""FDC nutrient-number -> FoodItem field mapping, shared by the on-demand API importer
(usda_client.py) and the bulk CSV importer (management/commands/import_usda_bulk_csv.py)
so the two stay in sync rather than drifting apart."""

# FDC nutrient numbers (stable across data types) -> FoodItem per-100g field name.
# FDC normalizes every food's nutrient amount to "per 100g/100mL" regardless of category
# (Foundation, SR Legacy, Branded, Survey), unlike a Branded food's `labelNutrients` (API)
# / the Nutrition Facts panel, which is per-serving - so this mapping works for any type.
NUTRIENT_NUMBER_TO_FIELD = {
    "203": "protein_g_per_100g",
    "205": "carbs_g_per_100g",
    "204": "fat_g_per_100g",
    "291": "fiber_g_per_100g",
    "269": "sugar_g_per_100g",
    "307": "sodium_mg_per_100g",
    "306": "potassium_mg_per_100g",
    "301": "calcium_mg_per_100g",
    "303": "iron_mg_per_100g",
    "401": "vitamin_c_mg_per_100g",
    "320": "vitamin_a_mcg_per_100g",
}

# Calories are special-cased: SR Legacy/Branded/Survey foods report plain "Energy"
# (208, kcal), but Foundation Foods drop that in favor of Atwater-factor variants
# (957 "General Factors", 958 "Specific Factors") - checked in this priority order,
# first match wins.
CALORIE_NUTRIENT_NUMBERS = ("208", "957", "958")

# calories/protein/carbs/fat are non-nullable on FoodItem - refuse to import a food
# missing any of these rather than silently writing a 0 that looks like real data.
REQUIRED_FIELDS = ("calories_per_100g", "protein_g_per_100g", "carbs_g_per_100g", "fat_g_per_100g")


def missing_required_fields(fields):
    return [field for field in REQUIRED_FIELDS if field not in fields]
