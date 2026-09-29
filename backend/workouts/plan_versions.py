"""WorkoutPlan-specific pieces of the effective-dated plan versioning in
accounts/plan_versions.py."""

from accounts.plan_versions import plan_for_date

from .models import PlanExercise, PlanSession, WorkoutPlan, WorkoutSession


def workout_versions(trainee):
    return WorkoutPlan.objects.filter(trainee=trainee)


def started_workout_plan_ids(trainee, on_date):
    return WorkoutSession.objects.filter(trainee=trainee, date=on_date).values_list(
        "plan_session__plan_id", flat=True
    )


def workout_plan_for_date(trainee, on_date):
    return plan_for_date(workout_versions(trainee), on_date, started_workout_plan_ids(trainee, on_date))


def copy_workout_plan(plan):
    """A new draft version with the same sessions -> exercises, superset
    pairings remapped onto the copies."""
    new_plan = WorkoutPlan.objects.create(
        trainee=plan.trainee, name=plan.name, sessions_per_week=plan.sessions_per_week
    )
    copies = {}
    pairs = []
    for session in plan.sessions.all():
        new_session = PlanSession.objects.create(
            plan=new_plan, label=session.label, order=session.order, notes=session.notes
        )
        for pe in session.exercises.all():
            copies[pe.id] = PlanExercise.objects.create(
                session=new_session,
                exercise_id=pe.exercise_id,
                target_sets=pe.target_sets,
                target_reps_min=pe.target_reps_min,
                target_reps_max=pe.target_reps_max,
                default_rest_seconds=pe.default_rest_seconds,
                order=pe.order,
                notes=pe.notes,
            )
            if pe.superset_with_id:
                pairs.append((pe.id, pe.superset_with_id))
    for pe_id, partner_id in pairs:
        if partner_id in copies:
            copy = copies[pe_id]
            copy.superset_with = copies[partner_id]
            copy.save(update_fields=["superset_with"])
    return new_plan
