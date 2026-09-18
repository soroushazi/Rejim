from django.db.models import Sum

# Duration-based estimate for a logged workout - weight training doesn't have
# a stored MET value per exercise, so this is a single flat rate rather than
# an exercise-by-exercise formula (deliberately out of scope, see CLAUDE.md).
WORKOUT_KCAL_PER_MINUTE = 6

# TDEE = BMR x activity multiplier. The multiplier is picked from that day's
# step count as a proxy for general daily activity level (the same signal
# wearables use), separate from - and additive with - calories from a logged
# WorkoutSession or ActivityLog, which capture specific bouts of exercise a
# step count alone wouldn't fully credit (e.g. resistance training, cycling).
_STEP_ACTIVITY_MULTIPLIERS = [
    (12500, 1.9),
    (10000, 1.725),
    (7500, 1.55),
    (5000, 1.375),
]
_SEDENTARY_MULTIPLIER = 1.2


def _activity_multiplier(steps):
    if steps is None:
        return _SEDENTARY_MULTIPLIER
    for threshold, multiplier in _STEP_ACTIVITY_MULTIPLIERS:
        if steps >= threshold:
            return multiplier
    return _SEDENTARY_MULTIPLIER


def estimate_calories_out(trainee, target_date):
    """Breakdown of estimated calories burned for one day: TDEE (BMR x a
    step-derived activity multiplier) plus logged workouts and ActivityLog
    entries. `tdee`/`bmr` are None when the trainee's profile lacks the body
    stats compute_bmr needs (height/age/a resolvable weight) - the total
    still includes whatever else is known rather than refusing to answer."""
    from accounts.services import compute_bmr
    from tracker.models import ActivityLog, DailyMetric
    from workouts.models import WorkoutSession

    bmr = compute_bmr(trainee)
    steps = DailyMetric.objects.filter(trainee=trainee, date=target_date).values_list("steps", flat=True).first()
    multiplier = _activity_multiplier(steps)
    tdee = round(bmr * multiplier) if bmr is not None else None

    workout_minutes = (
        WorkoutSession.objects.filter(trainee=trainee, date=target_date).aggregate(total=Sum("duration_minutes"))[
            "total"
        ]
        or 0
    )
    workout_calories = workout_minutes * WORKOUT_KCAL_PER_MINUTE

    activity_calories = (
        ActivityLog.objects.filter(trainee=trainee, date=target_date).aggregate(total=Sum("calories_burned"))[
            "total"
        ]
        or 0
    )

    total = (tdee or 0) + workout_calories + activity_calories

    return {
        "bmr": bmr,
        "activity_multiplier": multiplier,
        "tdee": tdee,
        "workout_calories": workout_calories,
        "activity_calories": activity_calories,
        "total": total,
    }
