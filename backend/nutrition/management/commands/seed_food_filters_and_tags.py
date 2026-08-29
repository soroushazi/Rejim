from decimal import Decimal

from django.core.management.base import BaseCommand

from nutrition.models import DietaryTag, FoodItem, MacroFilter

# Fixed vocabulary. macro_filters classify a food's macro *role* (for
# substitution search - "show me lean protein options"); dietary_tags flag
# diet-type compatibility. Both are shared reference data (see MacroFilter/
# DietaryTag docstrings) - trainers can extend the list later via the admin
# or the API, this command just seeds a sensible starting set.
MACRO_FILTERS = [
    "Lean Protein",
    "Fatty Protein",
    "Complex Carb",
    "Fruit",
    "Vegetable",
    "Fat / Oil",
    "Legume",
    "Dairy",
]

DIETARY_TAGS = [
    "Vegan",
    "Vegetarian",
    "Pescatarian",
    "Gluten-Free",
    "Dairy-Free",
    "Keto",
    "Low-Carb",
    "High-Protein",
    "Paleo",
    "Nut-Free",
    "Soy-Free",
]

# Keyword groups used to classify existing FoodItems by name. Deliberately
# specific (e.g. "sirloin"/"flank" rather than bare "steak") to avoid
# cross-matching unrelated items such as "Tuna steak".
MEAT_KEYWORDS = ["chicken", "turkey", "beef", "pork", "bacon", "sirloin", "flank"]
FISH_KEYWORDS = ["salmon", "tuna", "tilapia", "cod", "shrimp", "sardine"]
DAIRY_KEYWORDS = ["milk", "yogurt", "cheese", "kefir"]
LEGUME_KEYWORDS = ["black beans", "kidney beans", "lentil", "chickpea", "edamame"]
PLANT_PROTEIN_KEYWORDS = ["tofu", "tempeh", "seitan", "protein powder"]
GRAIN_KEYWORDS = ["rice", "oats", "bread", "pasta", "tortilla", "couscous", "quinoa"]
FRUIT_KEYWORDS = [
    "banana", "apple", "berr", "orange", "grape", "mango", "pineapple", "watermelon", "raisin", "date",
]
VEGETABLE_KEYWORDS = [
    "broccoli", "spinach", "kale", "pepper", "carrot", "cucumber", "zucchini",
    "asparagus", "green beans", "cauliflower", "tomato", "mushroom", "onion", "salad", "lettuce",
]
FAT_KEYWORDS = ["oil", "almond", "peanut butter", "avocado"]
GLUTEN_KEYWORDS = ["bread", "pasta", "couscous", "seitan"]
NUT_KEYWORDS = ["almond", "peanut"]
SOY_KEYWORDS = ["tofu", "tempeh", "edamame", "soy"]
DAIRY_DERIVED_EXTRA = ["whey", "jocko"]

LEAN_FAT_THRESHOLD = Decimal("6")
PROTEIN_ROLE_THRESHOLD = Decimal("8")
HIGH_PROTEIN_THRESHOLD = Decimal("15")
LOW_CARB_THRESHOLD = Decimal("10")
CONCENTRATED_FAT_THRESHOLD = Decimal("20")


def _has_any(text, keywords):
    return any(keyword in text for keyword in keywords)


def classify(item):
    """Return (macro_filter_names, dietary_tag_names) for a FoodItem, inferred
    from its name and per-100g macros. Heuristic, not authoritative - a trainer
    or trainee can always correct it by hand for items they add themselves."""
    name = item.name.lower()
    protein = item.protein_g_per_100g or Decimal("0")
    carbs = item.carbs_g_per_100g or Decimal("0")
    fat = item.fat_g_per_100g or Decimal("0")

    is_meat = _has_any(name, MEAT_KEYWORDS)
    is_fish = _has_any(name, FISH_KEYWORDS)
    is_egg = "egg" in name
    is_dairy = _has_any(name, DAIRY_KEYWORDS)
    is_legume = _has_any(name, LEGUME_KEYWORDS)
    is_plant_protein = _has_any(name, PLANT_PROTEIN_KEYWORDS)
    is_grain = _has_any(name, GRAIN_KEYWORDS)
    is_starchy_veg = "potato" in name
    is_fruit = _has_any(name, FRUIT_KEYWORDS)
    is_vegetable = _has_any(name, VEGETABLE_KEYWORDS)
    is_fat_source = _has_any(name, FAT_KEYWORDS)
    protein_role = is_meat or is_fish or is_egg or is_dairy or is_legume or is_plant_protein

    filters = set()
    if protein_role and protein >= PROTEIN_ROLE_THRESHOLD:
        filters.add("Fatty Protein" if fat > LEAN_FAT_THRESHOLD else "Lean Protein")
    if is_legume:
        filters.add("Legume")
    if is_dairy:
        filters.add("Dairy")
    if is_grain or is_starchy_veg:
        filters.add("Complex Carb")
    if is_fruit:
        filters.add("Fruit")
    if is_vegetable:
        filters.add("Vegetable")
    if is_fat_source:
        filters.add("Fat / Oil")
    elif fat >= CONCENTRATED_FAT_THRESHOLD:
        filters.add("Fat / Oil")

    dairy_derived = is_dairy or _has_any(name, DAIRY_DERIVED_EXTRA)
    contains_gluten = _has_any(name, GLUTEN_KEYWORDS) or "wheat" in name
    contains_nuts = _has_any(name, NUT_KEYWORDS)
    contains_soy = _has_any(name, SOY_KEYWORDS)
    low_carb = carbs <= LOW_CARB_THRESHOLD

    tags = set()
    if not (is_meat or is_fish or is_egg or dairy_derived):
        tags.add("Vegan")
    if not (is_meat or is_fish):
        tags.add("Vegetarian")
    if not is_meat:
        tags.add("Pescatarian")
    if not contains_gluten:
        tags.add("Gluten-Free")
    if not dairy_derived:
        tags.add("Dairy-Free")
    if not contains_nuts:
        tags.add("Nut-Free")
    if not contains_soy:
        tags.add("Soy-Free")
    if protein >= HIGH_PROTEIN_THRESHOLD:
        tags.add("High-Protein")
    if low_carb:
        tags.add("Low-Carb")
        if not (is_grain or is_fruit or is_legume):
            tags.add("Keto")
    paleo_eligible = (
        is_meat or is_fish or is_egg or is_fruit or is_vegetable or is_starchy_veg
        or (is_fat_source and "peanut" not in name)
    )
    if paleo_eligible and not (dairy_derived or is_grain or is_legume or is_plant_protein):
        tags.add("Paleo")

    return filters, tags


class Command(BaseCommand):
    help = (
        "Seed the fixed MacroFilter/DietaryTag vocabulary and auto-classify every "
        "existing FoodItem by name and macros. Idempotent - safe to rerun."
    )

    def handle(self, *args, **options):
        macro_filters = {name: MacroFilter.objects.get_or_create(name=name)[0] for name in MACRO_FILTERS}
        dietary_tags = {name: DietaryTag.objects.get_or_create(name=name)[0] for name in DIETARY_TAGS}

        classified = 0
        for item in FoodItem.objects.all():
            filter_names, tag_names = classify(item)
            item.macro_filters.set([macro_filters[name] for name in filter_names])
            item.dietary_tags.set([dietary_tags[name] for name in tag_names])
            classified += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(macro_filters)} macro filters, {len(dietary_tags)} dietary tags, "
                f"classified {classified} food items."
            )
        )
