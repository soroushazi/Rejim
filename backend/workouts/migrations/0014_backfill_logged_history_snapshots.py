from django.db import migrations


def backfill(apps, schema_editor):
    WorkoutSession = apps.get_model("workouts", "WorkoutSession")
    LoggedExercise = apps.get_model("workouts", "LoggedExercise")

    # Every existing row still has a live plan_session/plan_exercise at this
    # point (nothing's been deleted under the old CASCADE behavior without
    # also deleting the row itself) - this is the one-time backfill so
    # existing history survives a plan edit exactly like a newly-logged one
    # would, going forward (see WorkoutSessionSerializer._upsert).
    for session in WorkoutSession.objects.filter(plan_session__isnull=False, plan_session_label=""):
        session.plan_session_label = session.plan_session.label
        session.save(update_fields=["plan_session_label"])

    for logged_exercise in LoggedExercise.objects.filter(plan_exercise__isnull=False, planned_exercise__isnull=True):
        logged_exercise.planned_exercise_id = logged_exercise.plan_exercise.exercise_id
        logged_exercise.save(update_fields=["planned_exercise"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("workouts", "0013_loggedexercise_planned_exercise_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill, noop),
    ]
