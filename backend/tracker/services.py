from decimal import Decimal

from django.db.models import Avg

# Additive TDEE model (see tdee-calculation-spec.md at the repo root):
# TDEE = BMR + NEAT (from steps) + EAT (from logged workouts/activities) + TEF (from
# logged food). Each component independently defaults to 0 when its underlying data is
# missing for that day - never a bucketed guess, unlike the step-multiplier model this
# replaces.

# ~0.04 kcal/step at 70kg (walking ~3.3 METs), scales linearly with body weight.
NEAT_KCAL_PER_STEP_PER_KG = Decimal("0.00057")

# A WorkoutSession has no "type"/intensity field of its own, so its MET is inferred
# from that session's average logged RPE across working (non-warmup) sets - the
# vigorous/moderate weightlifting MET values from the spec's own seed list. No RPE
# logged at all (or no working sets) falls back to moderate, same "always have a
# fallback" rule the spec states for the manual-override case below.
WORKOUT_MET_MODERATE = Decimal("3.5")
WORKOUT_MET_VIGOROUS = Decimal("6.0")
RPE_VIGOROUS_THRESHOLD = 7

TEF_RATE = Decimal("0.10")


def _workout_met(session):
    from workouts.models import LoggedSet

    avg_rpe = LoggedSet.objects.filter(
        logged_exercise__session=session, is_warmup=False, rpe__isnull=False
    ).aggregate(avg=Avg("rpe"))["avg"]
    if avg_rpe is not None and avg_rpe >= RPE_VIGOROUS_THRESHOLD:
        return WORKOUT_MET_VIGOROUS
    return WORKOUT_MET_MODERATE


def calculate_tdee(trainee, target_date, consumed_calories=None):
    """Estimated calories burned for one day, as an additive component breakdown.
    `bmr` is None when the trainee's profile lacks the body stats compute_bmr needs
    (height/age/a resolvable weight) - every other component still computes whatever
    it can rather than refusing to answer. `consumed_calories` lets a caller that
    already computed the day's food-log total (e.g. DailySummaryView) pass it in
    instead of this function re-querying it; omit it to have this function compute TEF
    from FoodLog itself, so it stays usable standalone (Progress, future recommendation
    logic, ...) with just a trainee + date."""
    from accounts.services import compute_bmr, resolve_weight_kg_as_of
    from nutrition.models import FoodLog
    from nutrition.services import sum_nutrients
    from tracker.models import ActivityLog, DailyMetric
    from workouts.models import WorkoutSession

    weight_kg = resolve_weight_kg_as_of(trainee, target_date)
    bmr = compute_bmr(trainee, as_of=target_date)

    steps = DailyMetric.objects.filter(trainee=trainee, date=target_date).values_list("steps", flat=True).first()
    neat = round(steps * weight_kg * NEAT_KCAL_PER_STEP_PER_KG) if steps and weight_kg else 0

    workout_calories = 0
    if weight_kg:
        for session in WorkoutSession.objects.filter(trainee=trainee, date=target_date):
            if not session.duration_minutes:
                continue
            met = _workout_met(session)
            workout_calories += round(met * weight_kg * Decimal(session.duration_minutes) / 60)

    activity_calories = 0
    if weight_kg:
        for log in ActivityLog.objects.filter(trainee=trainee, date=target_date).select_related("activity_met"):
            if log.calories_burned is not None:
                activity_calories += log.calories_burned  # manual override wins over the MET estimate
            else:
                activity_calories += round(log.activity_met.met_value * weight_kg * Decimal(log.duration_minutes) / 60)

    if consumed_calories is None:
        food_logs = FoodLog.objects.filter(trainee=trainee, logged_meal__date=target_date) | FoodLog.objects.filter(
            trainee=trainee, logged_meal__isnull=True, logged_at__date=target_date
        )
        consumed_calories = sum_nutrients([log.actual_nutrients() for log in food_logs])["calories"]
    tef = round(TEF_RATE * consumed_calories) if consumed_calories else 0

    total = (bmr or 0) + neat + workout_calories + activity_calories + tef

    return {
        "bmr": bmr,
        "neat": neat,
        "workout_calories": workout_calories,
        "activity_calories": activity_calories,
        "tef": tef,
        "total": total,
    }
