from django.db.models import F, Q

from usersettings.models import Goal

from .models import Exercise, LoggedExercise, PlanExercise


def exercise_usage(exercise):
    """Everything that references an Exercise and would block deleting it
    (all PROTECT) - shown to the trainer before a delete, see
    ExerciseViewSet.usage/destroy."""
    logged = LoggedExercise.objects.filter(Q(planned_exercise=exercise) | Q(substituted_exercise=exercise))
    plan_exercises = PlanExercise.objects.filter(exercise=exercise)
    goals = Goal.objects.filter(exercise=exercise)
    usage = {
        "logged_count": logged.count(),
        "logged_trainee_count": logged.values("session__trainee").distinct().count(),
        "plan_count": plan_exercises.values("session__plan").distinct().count(),
        "plan_trainee_count": plan_exercises.values("session__plan__trainee").distinct().count(),
        "goal_count": goals.count(),
    }
    usage["in_use"] = bool(usage["logged_count"] or usage["plan_count"] or usage["goal_count"])
    return usage


def replace_exercise(old, new):
    """Points everything that references `old` at `new` instead, so `old` can
    be deleted without losing any plan, logged history, or goal - meant for
    getting rid of a duplicate. Deliberately writes through every plan
    version, live and past included (bypassing PlanVersionLockMixin): it's
    the same movement under a different row, not a plan change. Call inside
    a transaction."""
    PlanExercise.objects.filter(exercise=old).update(exercise=new)
    LoggedExercise.objects.filter(planned_exercise=old).update(planned_exercise=new)
    LoggedExercise.objects.filter(substituted_exercise=old).update(substituted_exercise=new)
    # A substitution that now names the very exercise that was planned
    # isn't a substitution anymore.
    LoggedExercise.objects.filter(substituted_exercise=new, planned_exercise=F("substituted_exercise")).update(
        substituted_exercise=None
    )
    Goal.objects.filter(exercise=old).update(exercise=new)

    # Carry the curated alternatives over in both directions.
    new.alternatives.add(*old.alternatives.exclude(pk=new.pk))
    for exercise in Exercise.objects.filter(alternatives=old).exclude(pk=new.pk):
        exercise.alternatives.add(new)
