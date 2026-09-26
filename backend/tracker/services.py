from decimal import Decimal

# TDEE = BMR + movement energy + TEF (from logged food) - see
# tdee-calculation-spec.md at the repo root (including its two revision
# notes) for the full history. "Movement energy" is a per-day priority
# waterfall over whatever data actually exists that day, from best to
# worst:
#   Tier 1 - a daily Active Energy total was entered (DailyMetric.
#     active_energy_kcal): use it directly. Any per-session workout/activity
#     calories that day are informational only (exercise history/PRs), not
#     summed in - a wearable's own daily total already reconciles a logged
#     workout/activity's minutes against that same day's step count, so
#     adding them on top would double-count exactly what Tier 1 exists to
#     avoid.
#   Tier 2 - no daily total, but at least one logged workout/activity that
#     day has its own device-reported calories: sum those directly (solid
#     data), then estimate the steps those step-generating activities would
#     have contributed (ActivityMET.steps_per_minute x duration) and
#     subtract that from the day's step count before converting whatever
#     steps remain to NEAT - so the same movement isn't counted once as
#     logged-activity calories and again as NEAT.
#   Tier 3 - no daily total and no per-session calories at all that day:
#     fall back to NEAT from the full day's steps. Never estimate calories
#     from duration/MET tables here - too imprecise to present as a real
#     number - so a logged workout/activity with no calories entered
#     contributes 0 (it still stores its own duration/sets for history).
# Each component still independently defaults to 0/null when its data is
# missing. The response's `tier` tells the frontend which case applied, so
# it can label a Tier 3 total as a lower-confidence, partial-data estimate.

# ~0.04 kcal/step at 70kg (walking ~3.3 METs), scales linearly with body
# weight. Only ever applied to steps not already attributed to a Tier 2
# logged activity (or, in Tier 3, the full day) - never on top of a Tier 1
# Active Energy total.
NEAT_KCAL_PER_STEP_PER_KG = Decimal("0.00057")

# A common baseline (1g protein per lb of body weight) - only used when the
# trainee's diet plan doesn't set its own protein target (see
# DailySummaryView.get). Protein only ever needs a *minimum* to flag against
# (unlike calories, which wants a tight range) - see nutrition/dietStatus
# on the frontend for the actual under-target check.
PROTEIN_MINIMUM_G_PER_LB = Decimal("1")


def estimate_minimum_protein_g(trainee, target_date):
    """1g of protein per lb of body weight, as of `target_date` (same weight
    resolution TDEE/BMR use, so a past day doesn't use a weight logged after
    it) - None if no weight can be resolved at all (no DailyMetric weight
    ever logged and no onboarding starting_weight)."""
    from accounts.services import resolve_weight_kg_as_of
    from progress.services import LB_TO_KG

    weight_kg = resolve_weight_kg_as_of(trainee, target_date)
    if weight_kg is None:
        return None
    return round(weight_kg / LB_TO_KG * PROTEIN_MINIMUM_G_PER_LB, 1)

TEF_RATE = Decimal("0.10")


def calculate_tdee(trainee, target_date, consumed_calories=None):
    """Estimated calories burned for one day - see the tier waterfall documented above.
    `bmr` is None when the trainee's profile lacks the body stats compute_bmr needs;
    `active_energy`/`logged_activity_calories`/`neat` are only ever populated by
    whichever tier actually applied (see `tier` in the return value) - the other two
    stay None. `consumed_calories` lets a caller that already computed the day's
    food-log total (e.g. DailySummaryView) pass it in instead of this function
    re-querying it; omit it to have this function compute TEF from FoodLog itself, so
    it stays usable standalone (Progress, future recommendation logic, ...) with just a
    trainee + date."""
    from accounts.services import compute_bmr, resolve_weight_kg_as_of
    from nutrition.models import FoodLog
    from nutrition.services import sum_nutrients
    from tracker.models import ActivityLog, DailyMetric
    from workouts.models import WorkoutSession

    bmr = compute_bmr(trainee, as_of=target_date)
    metric = DailyMetric.objects.filter(trainee=trainee, date=target_date).first()
    active_energy = metric.active_energy_kcal if metric else None
    day_steps = (metric.steps if metric else None) or 0

    logged_activity_calories = None
    neat = None

    if active_energy is not None:
        tier = 1
    else:
        weight_kg = resolve_weight_kg_as_of(trainee, target_date)
        workout_calories = [
            s.calories_burned
            for s in WorkoutSession.objects.filter(trainee=trainee, date=target_date)
            if s.calories_burned is not None
        ]
        day_activities = list(
            ActivityLog.objects.filter(trainee=trainee, date=target_date).select_related("activity_met")
        )
        activity_calories = [a.calories_burned for a in day_activities if a.calories_burned is not None]

        if workout_calories or activity_calories:
            tier = 2
            logged_activity_calories = sum(workout_calories) + sum(activity_calories)
            # Every step-generating activity logged that day gets subtracted, not just
            # the ones with their own calories entered - the overlap with the day's
            # step count happened regardless of whether calories were also logged for
            # it; only the *calorie* sum above requires "solid data".
            steps_to_subtract = sum(
                round(a.activity_met.steps_per_minute * a.duration_minutes)
                for a in day_activities
                if a.activity_met.steps_per_minute
            )
            remaining_steps = max(0, day_steps - steps_to_subtract)
            neat = round(remaining_steps * weight_kg * NEAT_KCAL_PER_STEP_PER_KG) if weight_kg else 0
        else:
            tier = 3
            neat = round(day_steps * weight_kg * NEAT_KCAL_PER_STEP_PER_KG) if day_steps and weight_kg else 0

    movement_energy = active_energy if tier == 1 else (logged_activity_calories or 0) + (neat or 0)

    if consumed_calories is None:
        food_logs = FoodLog.objects.filter(trainee=trainee, logged_meal__date=target_date) | FoodLog.objects.filter(
            trainee=trainee, logged_meal__isnull=True, logged_at__date=target_date
        )
        consumed_calories = sum_nutrients([log.actual_nutrients() for log in food_logs])["calories"]
    tef = round(TEF_RATE * consumed_calories) if consumed_calories else 0

    total = (bmr or 0) + movement_energy + tef

    return {
        "bmr": bmr,
        "tier": tier,
        "active_energy": active_energy,
        "logged_activity_calories": logged_activity_calories,
        "neat": neat,
        "tef": tef,
        "total": total,
    }
