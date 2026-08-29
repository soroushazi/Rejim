from django.core.management.base import BaseCommand, CommandError

from accounts.models import User
from workouts.models import Exercise, PlanExercise, PlanSession, WorkoutPlan

PLAN_NAME = "Sample Strength Plan"

# (session label, session order, [(exercise name, target_sets, reps_min, reps_max, rest_seconds, order), ...])
SESSIONS = [
    (
        "Push",
        0,
        [
            ("Barbell Bench Press", 4, 6, 10, 150, 0),
            ("Overhead Barbell Press", 3, 8, 12, 120, 1),
            ("Incline Dumbbell Press", 3, 8, 12, 90, 2),
            ("Lateral Raise", 3, 12, 15, 60, 3),
            ("Triceps Pushdown", 3, 10, 15, 60, 4),
        ],
    ),
    (
        "Pull",
        1,
        [
            ("Deadlift", 3, 5, 8, 180, 0),
            ("Pull-Up", 4, 6, 10, 120, 1),
            ("Bent-Over Barbell Row", 3, 8, 12, 90, 2),
            ("Face Pull", 3, 12, 15, 60, 3),
            ("Barbell Curl", 3, 8, 12, 60, 4),
        ],
    ),
    (
        "Legs",
        2,
        [
            ("Barbell Back Squat", 4, 6, 10, 180, 0),
            ("Romanian Deadlift", 3, 8, 12, 120, 1),
            ("Leg Press", 3, 10, 15, 90, 2),
            ("Leg Curl (Lying/Seated)", 3, 10, 15, 60, 3),
            ("Standing Calf Raise", 4, 12, 15, 45, 4),
        ],
    ),
]


class Command(BaseCommand):
    help = (
        "Seed a sample WorkoutPlan for trainee1 (as if authored by trainer1) - a "
        "classic Push/Pull/Legs rotation built from the seeded Exercise bank. "
        "Idempotent - rerunning replaces this plan's sessions with a fresh copy."
    )

    def handle(self, *args, **options):
        try:
            trainee = User.objects.get(username="trainee1")
        except User.DoesNotExist:
            raise CommandError("trainee1 not found - this command expects the dev-only trainee1 user.")

        plan, _ = WorkoutPlan.objects.get_or_create(
            trainee=trainee, name=PLAN_NAME, defaults={"sessions_per_week": 3}
        )
        plan.sessions_per_week = 3
        plan.save(update_fields=["sessions_per_week"])
        plan.sessions.all().delete()

        for label, order, exercises in SESSIONS:
            session = PlanSession.objects.create(plan=plan, label=label, order=order)
            for name, target_sets, reps_min, reps_max, rest_seconds, ex_order in exercises:
                try:
                    exercise = Exercise.objects.get(name=name)
                except Exercise.DoesNotExist:
                    raise CommandError(f"Expected Exercise '{name}' not found - run seed_exercises first.")
                PlanExercise.objects.create(
                    session=session,
                    exercise=exercise,
                    target_sets=target_sets,
                    target_reps_min=reps_min,
                    target_reps_max=reps_max,
                    default_rest_seconds=rest_seconds,
                    order=ex_order,
                )

        self.stdout.write(self.style.SUCCESS(f"Seeded workout plan '{plan.name}' for {trainee.username}."))
