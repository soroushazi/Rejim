from decimal import Decimal


def resolve_current_weight_kg(user):
    """Latest DailyMetric weight for this trainee if one exists, else their
    onboarding starting_weight - both converted to a canonical kg Decimal via
    progress.services.to_kg (reused, not reimplemented). Backs both BMI's
    weight source and Goal's "starting point" resolution, since the spec's
    two rules are the same fallback applied twice. Imports are lazy to keep
    accounts (the base app) from importing tracker/progress at model-load time."""
    from progress.services import to_kg
    from tracker.models import DailyMetric

    latest = DailyMetric.objects.filter(trainee=user, weight__isnull=False).order_by("-date").first()
    if latest is not None:
        return to_kg(latest.weight, latest.weight_unit)
    if user.starting_weight is not None:
        return to_kg(user.starting_weight, user.starting_weight_unit)
    return None


def compute_bmi(user):
    """(bmi, category) rounded to 1 decimal, or (None, None) if height or a
    resolvable weight is missing (e.g. every trainer, or a trainee who hasn't
    completed onboarding and has no logs yet)."""
    if user.height_cm is None:
        return None, None
    weight_kg = resolve_current_weight_kg(user)
    if weight_kg is None:
        return None, None

    height_m = Decimal(str(user.height_cm)) / Decimal("100")
    bmi = weight_kg / (height_m**2)
    bmi = round(bmi, 1)

    if bmi < 18.5:
        category = "underweight"
    elif bmi < 25:
        category = "normal"
    elif bmi < 30:
        category = "overweight"
    else:
        category = "obese"
    return bmi, category
