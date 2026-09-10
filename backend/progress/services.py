from datetime import timedelta
from decimal import Decimal

from django.db.models import Q

from nutrition.models import FoodLog
from nutrition.services import sum_nutrients

LB_TO_KG = Decimal("0.45359237")


def to_kg(value, unit):
    """Convert a kg/lb-tagged weight value to a canonical kg Decimal. No such
    helper existed anywhere in the codebase before this - DailyMetric.weight
    and LoggedSet.weight are both per-row kg/lb, so anything that sums or
    charts weight across rows needs one."""
    if value is None:
        return None
    value = Decimal(str(value))
    return value * LB_TO_KG if unit == "lb" else value


def monday_of(d):
    """The Monday of d's ISO week - same definition frontend/src/lib/workoutStreak.ts's
    mondayOf() uses client-side, so this dashboard's week boundaries never
    disagree with the existing Workout -> Progress streak feature."""
    return d - timedelta(days=d.weekday())


def food_logs_by_day(trainee, start, end):
    """FoodLog rows in [start, end], grouped by the day they're logged against:
    logged_meal.date for structured Diet-tab logs, logged_at.date() for ad hoc
    ones with no logged_meal - the same OR pattern DailySummaryView uses for a
    single date, generalized to a range so /overview/ and /nutrition/ never
    disagree on which day a FoodLog belongs to."""
    food_logs = FoodLog.objects.filter(trainee=trainee).filter(
        Q(logged_meal__date__range=(start, end))
        | Q(logged_meal__isnull=True, logged_at__date__range=(start, end))
    ).select_related("logged_meal")

    by_day = {}
    for log in food_logs:
        day = log.logged_meal.date if log.logged_meal_id else log.logged_at.date()
        by_day.setdefault(day, []).append(log.actual_nutrients())

    return {day: sum_nutrients(nutrient_dicts) for day, nutrient_dicts in by_day.items()}


def diet_adherence_pct(trainee, start, end):
    """% of days in [start, end] with >=1 FoodLog entry - shared by /nutrition/'s
    and /consistency/'s adherence figures so the two can't drift apart."""
    days_in_range = (end - start).days + 1
    if days_in_range <= 0:
        return 0.0
    logged_days = food_logs_by_day(trainee, start, end)
    return round(len(logged_days) / days_in_range * 100, 1)
