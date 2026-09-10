from datetime import timedelta

from django.utils import timezone

from progress.services import food_logs_by_day, to_kg
from tracker.models import DailyMetric
from usersettings.models import Goal
from workouts.models import WorkoutSession

CONSISTENCY_LOOKBACK_DAYS = 14
CONSISTENCY_LOW_THRESHOLD_PCT = 50
WEIGHT_TREND_DELTA_KG = 0.5


def compute_weight_trend(trainee):
    """'losing'/'gaining'/'maintaining'/None - from the two most recent
    DailyMetric weight entries; falls back to the trainee's active weight
    Goal.direction when there are fewer than 2 to compare against."""
    recent = list(
        DailyMetric.objects.filter(trainee=trainee, weight__isnull=False).order_by("-date")[:2]
    )
    if len(recent) == 2:
        latest_kg = to_kg(recent[0].weight, recent[0].weight_unit)
        prior_kg = to_kg(recent[1].weight, recent[1].weight_unit)
        delta = latest_kg - prior_kg
        if delta > WEIGHT_TREND_DELTA_KG:
            return "gaining"
        if delta < -WEIGHT_TREND_DELTA_KG:
            return "losing"
        return "maintaining"

    goal = Goal.objects.filter(trainee=trainee, goal_type=Goal.GoalType.WEIGHT, is_active=True).first()
    if not goal:
        return None
    # Goal.direction uses lose/gain/maintain; normalize to the -ing forms
    # used as this endpoint's trend values.
    return {"lose": "losing", "gain": "gaining", "maintain": "maintaining"}.get(goal.direction)


def compute_consistency_pct(trainee):
    """% of the last CONSISTENCY_LOOKBACK_DAYS days with >=1 log of any kind
    (DailyMetric, WorkoutSession, or a food log) - the same three signals
    ProgressConsistencyView already unions for its streak calculation,
    generalized here into one combined adherence percentage per trainee."""
    end = timezone.localdate()
    start = end - timedelta(days=CONSISTENCY_LOOKBACK_DAYS - 1)

    active_dates = set(
        DailyMetric.objects.filter(trainee=trainee, date__range=(start, end)).values_list("date", flat=True)
    ) | set(
        WorkoutSession.objects.filter(trainee=trainee, date__range=(start, end)).values_list("date", flat=True)
    ) | set(food_logs_by_day(trainee, start, end))

    return round(len(active_dates) / CONSISTENCY_LOOKBACK_DAYS * 100, 1)


def compute_last_active(trainee):
    """Most recent date of any log (DailyMetric, WorkoutSession, food log) -
    None if the trainee has never logged anything."""
    candidates = []
    latest_metric = DailyMetric.objects.filter(trainee=trainee).order_by("-date").values_list("date", flat=True).first()
    if latest_metric:
        candidates.append(latest_metric)
    latest_session = WorkoutSession.objects.filter(trainee=trainee).order_by("-date").values_list("date", flat=True).first()
    if latest_session:
        candidates.append(latest_session)
    # food_logs_by_day needs a bounded range - a generous 2-year lookback is
    # effectively unbounded at this app's Stage 1 scale (same window ProgressPage's
    # "All time" preset already uses).
    end = timezone.localdate()
    start = end - timedelta(days=730)
    food_days = food_logs_by_day(trainee, start, end)
    if food_days:
        candidates.append(max(food_days))
    return max(candidates) if candidates else None
