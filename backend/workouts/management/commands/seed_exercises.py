from django.core.management.base import BaseCommand

from workouts.models import Exercise, MuscleGroup

# Stage 1 self-seeded exercise bank — a starting set covering common lifts.
# image/video_url are left blank; trainers can attach real media later.
EXERCISES = [
    dict(name="Barbell Back Squat", difficulty_level=Exercise.Difficulty.ADVANCED, muscle_groups=["Quadriceps", "Glutes", "Hamstrings"]),
    dict(name="Goblet Squat", difficulty_level=Exercise.Difficulty.BEGINNER, muscle_groups=["Quadriceps", "Glutes"]),
    dict(name="Leg Press", difficulty_level=Exercise.Difficulty.BEGINNER, muscle_groups=["Quadriceps", "Glutes"]),
    dict(name="Romanian Deadlift", difficulty_level=Exercise.Difficulty.INTERMEDIATE, muscle_groups=["Hamstrings", "Glutes", "Lower Back"]),
    dict(name="Conventional Deadlift", difficulty_level=Exercise.Difficulty.ADVANCED, muscle_groups=["Hamstrings", "Glutes", "Lower Back"]),
    dict(name="Barbell Bench Press", difficulty_level=Exercise.Difficulty.INTERMEDIATE, muscle_groups=["Chest", "Triceps", "Shoulders"]),
    dict(name="Dumbbell Chest Press", difficulty_level=Exercise.Difficulty.BEGINNER, muscle_groups=["Chest", "Triceps", "Shoulders"]),
    dict(name="Push-Up", difficulty_level=Exercise.Difficulty.BEGINNER, muscle_groups=["Chest", "Triceps"]),
    dict(name="Overhead Press", difficulty_level=Exercise.Difficulty.INTERMEDIATE, muscle_groups=["Shoulders", "Triceps"]),
    dict(name="Lat Pulldown", difficulty_level=Exercise.Difficulty.BEGINNER, muscle_groups=["Lats", "Biceps"]),
    dict(name="Pull-Up", difficulty_level=Exercise.Difficulty.ADVANCED, muscle_groups=["Lats", "Biceps"]),
    dict(name="Barbell Row", difficulty_level=Exercise.Difficulty.INTERMEDIATE, muscle_groups=["Lats", "Upper Back", "Biceps"]),
    dict(name="Seated Cable Row", difficulty_level=Exercise.Difficulty.BEGINNER, muscle_groups=["Upper Back", "Lats", "Biceps"]),
    dict(name="Dumbbell Bicep Curl", difficulty_level=Exercise.Difficulty.BEGINNER, muscle_groups=["Biceps"]),
    dict(name="Triceps Pushdown", difficulty_level=Exercise.Difficulty.BEGINNER, muscle_groups=["Triceps"]),
    dict(name="Plank", difficulty_level=Exercise.Difficulty.BEGINNER, muscle_groups=["Core"]),
    dict(name="Hanging Leg Raise", difficulty_level=Exercise.Difficulty.ADVANCED, muscle_groups=["Core"]),
    dict(name="Walking Lunge", difficulty_level=Exercise.Difficulty.INTERMEDIATE, muscle_groups=["Quadriceps", "Glutes"]),
    dict(name="Hip Thrust", difficulty_level=Exercise.Difficulty.INTERMEDIATE, muscle_groups=["Glutes", "Hamstrings"]),
    dict(name="Standing Calf Raise", difficulty_level=Exercise.Difficulty.BEGINNER, muscle_groups=["Calves"]),
]

# Beginner-friendly alternatives for a harder movement, matched by name.
ALTERNATIVES = {
    "Barbell Back Squat": ["Goblet Squat", "Leg Press"],
    "Conventional Deadlift": ["Romanian Deadlift"],
    "Barbell Bench Press": ["Dumbbell Chest Press", "Push-Up"],
    "Pull-Up": ["Lat Pulldown"],
    "Barbell Row": ["Seated Cable Row"],
}


class Command(BaseCommand):
    help = "Seed the Exercise reference bank with a starting set of common movements."

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0
        exercises_by_name = {}

        for data in EXERCISES:
            name = data.pop("name")
            muscle_group_names = data.pop("muscle_groups")
            exercise, created = Exercise.objects.update_or_create(name=name, defaults=data)
            muscle_groups = [MuscleGroup.objects.get_or_create(name=mg_name)[0] for mg_name in muscle_group_names]
            exercise.muscle_groups.set(muscle_groups)
            exercises_by_name[name] = exercise
            created_count += created
            updated_count += not created

        for name, alt_names in ALTERNATIVES.items():
            exercise = exercises_by_name.get(name)
            if exercise is None:
                continue
            exercise.alternatives.set([exercises_by_name[alt] for alt in alt_names if alt in exercises_by_name])

        self.stdout.write(
            self.style.SUCCESS(f"Seeded Exercises: {created_count} created, {updated_count} updated.")
        )
