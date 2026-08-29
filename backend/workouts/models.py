from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
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
    equipment = models.CharField(max_length=100, blank=True)
    # Split rather than a single muscle_groups M2M so the muscle-diagram
    # visualization can show primary vs secondary intensity - mirrors
    # workout_sample.xlsx's own Major/Minor muscle group columns.
    primary_muscle_groups = models.ManyToManyField(
        MuscleGroup, related_name="primary_exercises", blank=True
    )
    secondary_muscle_groups = models.ManyToManyField(
        MuscleGroup, related_name="secondary_exercises", blank=True
    )
    difficulty_level = models.CharField(max_length=15, choices=Difficulty.choices, default=Difficulty.BEGINNER)
    image = models.ImageField(upload_to="exercises/", null=True, blank=True)
    video_url = models.URLField(null=True, blank=True)
    # Not symmetrical: each exercise curates its own top alternatives (see
    # seed_exercises), so B appearing in A's list doesn't force A into B's.
    alternatives = models.ManyToManyField("self", symmetrical=False, blank=True)

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
    # Target weekly training frequency (e.g. "3x/week") - used by Progress to
    # calculate the plan-consistency streak.
    sessions_per_week = models.PositiveSmallIntegerField(default=3)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.trainee})"


class PlanSession(models.Model):
    """One slot in the plan's rotation (e.g. "Session 1", "Session 2") - purely
    sequential, not tied to a calendar day. The trainee just does "the next
    session in the rotation" whenever they train; see WorkoutSession for the
    logged instance. Deliberately has no day_of_week (unlike the Diet app's
    ReferenceMeal/old PlanDay), since workout sessions rotate rather than
    repeat on fixed weekdays."""

    plan = models.ForeignKey(WorkoutPlan, on_delete=models.CASCADE, related_name="sessions")
    label = models.CharField(max_length=100)
    order = models.PositiveSmallIntegerField(default=0)
    # Trainer-authored guidance for this session as a whole (e.g. "focus on
    # tempo, don't go to failure this week") - shown to the trainee in Log.
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.plan.name} - {self.label}"


class PlanExercise(models.Model):
    session = models.ForeignKey(PlanSession, on_delete=models.CASCADE, related_name="exercises")
    exercise = models.ForeignKey(Exercise, on_delete=models.PROTECT, related_name="plan_exercises")
    target_sets = models.PositiveSmallIntegerField()
    target_reps_min = models.PositiveSmallIntegerField(default=8)
    target_reps_max = models.PositiveSmallIntegerField(default=12)
    default_rest_seconds = models.PositiveSmallIntegerField(default=120)
    order = models.PositiveSmallIntegerField(default=0)
    # Trainer-authored cue for this specific exercise (e.g. "keep your back
    # straight, use a spotter") - shown to the trainee in Log.
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.exercise.name} ({self.target_sets}x{self.target_reps_min}-{self.target_reps_max})"


class WorkoutSession(models.Model):
    """A trainee's logged instance of one PlanSession on a given date."""

    trainee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "trainee"},
        related_name="workout_sessions",
    )
    plan_session = models.ForeignKey(PlanSession, on_delete=models.CASCADE, related_name="logged_sessions")
    date = models.DateField()
    notes = models.TextField(blank=True)
    duration_minutes = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["-date"]
        unique_together = ("trainee", "plan_session", "date")

    def __str__(self):
        return f"{self.trainee} - {self.plan_session.label} - {self.date}"


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
    # Excluded from avg-reps-per-set (weight suggestions) and the Progress
    # strength score, so warming up doesn't skew either.
    is_warmup = models.BooleanField(default=False)
    # Rate of perceived exertion, 1-10. Optional - richer tracking for users
    # who want it, never required to complete a log.
    rpe = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(10)]
    )

    class Meta:
        ordering = ["set_number"]

    def __str__(self):
        return f"{self.logged_exercise} - set {self.set_number}"
