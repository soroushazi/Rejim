from django.conf import settings
from django.db import models


class DayOfWeek(models.IntegerChoices):
    MONDAY = 0, "Monday"
    TUESDAY = 1, "Tuesday"
    WEDNESDAY = 2, "Wednesday"
    THURSDAY = 3, "Thursday"
    FRIDAY = 4, "Friday"
    SATURDAY = 5, "Saturday"
    SUNDAY = 6, "Sunday"


class MuscleGroup(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Exercise(models.Model):
    class Difficulty(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    muscle_groups = models.ManyToManyField(MuscleGroup, related_name="exercises", blank=True)
    difficulty_level = models.CharField(max_length=15, choices=Difficulty.choices, default=Difficulty.BEGINNER)
    image = models.ImageField(upload_to="exercises/", null=True, blank=True)
    video_url = models.URLField(null=True, blank=True)
    alternatives = models.ManyToManyField("self", blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class WorkoutPlan(models.Model):
    trainee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "trainee"},
        related_name="workout_plans",
    )
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.trainee})"


class PlanDay(models.Model):
    plan = models.ForeignKey(WorkoutPlan, on_delete=models.CASCADE, related_name="days")
    label = models.CharField(max_length=100)
    day_of_week = models.PositiveSmallIntegerField(choices=DayOfWeek.choices, null=True, blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.plan.name} - {self.label}"


class PlanExercise(models.Model):
    day = models.ForeignKey(PlanDay, on_delete=models.CASCADE, related_name="exercises")
    exercise = models.ForeignKey(Exercise, on_delete=models.PROTECT, related_name="plan_exercises")
    target_sets = models.PositiveSmallIntegerField()
    target_reps = models.PositiveSmallIntegerField()
    default_rest_seconds = models.PositiveSmallIntegerField(default=120)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.exercise.name} ({self.target_sets}x{self.target_reps})"


class WorkoutSession(models.Model):
    trainee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "trainee"},
        related_name="workout_sessions",
    )
    plan_day = models.ForeignKey(PlanDay, on_delete=models.CASCADE, related_name="sessions")
    date = models.DateField()

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.trainee} - {self.plan_day.label} - {self.date}"


class LoggedExercise(models.Model):
    session = models.ForeignKey(WorkoutSession, on_delete=models.CASCADE, related_name="logged_exercises")
    plan_exercise = models.ForeignKey(PlanExercise, on_delete=models.CASCADE, related_name="logged_instances")
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.session} - {self.plan_exercise.exercise.name}"


class LoggedSet(models.Model):
    class WeightUnit(models.TextChoices):
        KG = "kg", "kg"
        LB = "lb", "lb"

    logged_exercise = models.ForeignKey(LoggedExercise, on_delete=models.CASCADE, related_name="sets")
    set_number = models.PositiveSmallIntegerField()
    weight = models.DecimalField(max_digits=6, decimal_places=2)
    weight_unit = models.CharField(max_length=2, choices=WeightUnit.choices, default=WeightUnit.KG)
    reps_done = models.PositiveSmallIntegerField()
    rest_seconds = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["set_number"]

    def __str__(self):
        return f"{self.logged_exercise} - set {self.set_number}"
