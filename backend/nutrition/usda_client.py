"""Thin client for USDA FoodData Central (FDC) - see USDA_API_SETUP_SPEC.md.

Only ever called from management/commands/import_usda_food.py, on demand. Never
called from the live app (a user searching/logging food never reaches this
module) - see CLAUDE.md's Diet Tracking section and the setup spec for why.
"""

import requests

from .usda_nutrient_map import CALORIE_NUTRIENT_NUMBERS, NUTRIENT_NUMBER_TO_FIELD, missing_required_fields

FDC_BASE_URL = "https://api.nal.usda.gov/fdc/v1"
REQUEST_TIMEOUT_SECONDS = 15

__all__ = [
    "USDAClientError",
    "search_foods",
    "get_food",
    "parse_food_nutrients",
    "missing_required_fields",
    "normalize_usda_name",
]


class USDAClientError(Exception):
    pass


def _get(path, api_key, params=None):
    params = dict(params or {})
    params["api_key"] = api_key
    try:
        response = requests.get(f"{FDC_BASE_URL}{path}", params=params, timeout=REQUEST_TIMEOUT_SECONDS)
    except requests.RequestException as exc:
        raise USDAClientError(f"Couldn't reach USDA FoodData Central: {exc}") from exc
    if response.status_code == 401:
        raise USDAClientError("USDA rejected the API key (401). Check USDA_API_KEY.")
    if response.status_code == 429:
        raise USDAClientError("USDA rate limit hit (429). Try again later.")
    if not response.ok:
        raise USDAClientError(f"USDA request failed: {response.status_code} {response.text[:300]}")
    return response.json()


def normalize_usda_name(name):
    """USDA's Branded Foods descriptions are typically ALL CAPS (as printed on
    packaging); Foundation/SR Legacy descriptions already read fine in USDA's own
    mixed case. Only reformats a name that's actually all-caps, to Title Case -
    leaves anything already mixed-case alone. Mirrors import_usda_bulk_csv.py's SQL
    (INITCAP, gated the same way) and the titleize_usda_food_names backfill command,
    so a name reads the same regardless of which import path produced it."""
    return name.title() if name.isupper() else name


def search_foods(query, api_key, page_size=10, data_types=None):
    """Returns FDC's raw list of search result dicts (fdcId, description, dataType,
    brandOwner, ...) for a free-text query."""
    params = {"query": query, "pageSize": page_size}
    if data_types:
        params["dataType"] = data_types
    data = _get("/foods/search", api_key, params)
    return data.get("foods", [])


def get_food(fdc_id, api_key):
    """Returns FDC's full detail dict for one food, by its fdcId."""
    return _get(f"/food/{fdc_id}", api_key)


def _nutrient_number(entry):
    nutrient = entry.get("nutrient") or {}
    return str(nutrient.get("number") or entry.get("nutrientNumber") or "").strip()


def _nutrient_value(entry):
    value = entry.get("amount")
    if value is None:
        value = entry.get("value")
    return value


def parse_food_nutrients(food_detail):
    """Maps an FDC food-detail dict's foodNutrients to FoodItem per-100g field names.
    Only recognized nutrients with a non-null value are included."""
    fields = {}
    calories_by_number = {}
    for entry in food_detail.get("foodNutrients", []):
        number = _nutrient_number(entry)
        value = _nutrient_value(entry)
        if value is None:
            continue
        if number in CALORIE_NUTRIENT_NUMBERS:
            calories_by_number[number] = value
            continue
        field = NUTRIENT_NUMBER_TO_FIELD.get(number)
        if field:
            fields[field] = value

    for number in CALORIE_NUTRIENT_NUMBERS:
        if number in calories_by_number:
            fields["calories_per_100g"] = calories_by_number[number]
            break

    return fields
