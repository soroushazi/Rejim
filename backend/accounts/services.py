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


def resolve_weight_kg_as_of(user, date):
    """Same fallback as resolve_current_weight_kg (latest DailyMetric weight, else
    starting_weight), but scoped to a specific date - for TDEE math (tracker.services.
    calculate_tdee), which estimates a *past* day and should use the weight known as of
    that day, not whatever the trainee weighs now. resolve_current_weight_kg itself
    stays as "true latest" for BMI/Goals, which always want today's answer regardless
    of what date something else on the page happens to be showing."""
    from progress.services import to_kg
    from tracker.models import DailyMetric

    latest = DailyMetric.objects.filter(trainee=user, weight__isnull=False, date__lte=date).order_by("-date").first()
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


def compute_bmr(user, as_of=None):
    """Basal metabolic rate in kcal/day via Mifflin-St Jeor, or None if
    height, age, or a resolvable weight is missing. `Sex.UNSPECIFIED` uses the
    average of the male/female sex terms (+5 / -161) rather than guessing.
    `as_of`: resolve weight as of that date (see resolve_weight_kg_as_of) instead of
    the true latest - used by tracker.services.calculate_tdee, which estimates a past
    day and shouldn't use a weight logged after it."""
    if user.height_cm is None or user.age is None:
        return None
    weight_kg = resolve_weight_kg_as_of(user, as_of) if as_of is not None else resolve_current_weight_kg(user)
    if weight_kg is None:
        return None

    from .models import User

    if user.sex == User.Sex.MALE:
        sex_term = Decimal("5")
    elif user.sex == User.Sex.FEMALE:
        sex_term = Decimal("-161")
    else:
        sex_term = Decimal("-78")

    bmr = Decimal("10") * weight_kg + Decimal("6.25") * Decimal(str(user.height_cm)) - Decimal("5") * user.age + sex_term
    return round(bmr)
