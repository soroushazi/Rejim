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


class ExerciseEditRequest(models.Model):
    """A trainee's freeform request to change something about a shared Exercise
    Bank entry - trainees can't edit Exercise directly (see CLAUDE.md's shared
    reference-data trust model), so this is how they flag a correction for a
    trainer to make. A trainer reviews the description, edits the exercise
    themselves, then marks this resolved."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RESOLVED = "resolved", "Resolved"

    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name="edit_requests")
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"is_trainee": True},
        related_name="exercise_edit_requests",
    )
    description = models.TextField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Edit request for {self.exercise.name} by {self.requested_by}"


class WorkoutPlan(models.Model):
    trainee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"is_trainee": True},
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
    # Superset pairing: always mirrored on both sides by PlanExerciseViewSet's
    # pair/unpair actions (never set directly through the plain serializer),
    # so at most one partner exists at a time and either side can be read from
    # this same field - no reverse accessor needed. Deleting either exercise
    # nulls the other's side automatically via SET_NULL. Pairs only (not
    # trisets+) - matches how the feature was requested.
    superset_with = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.exercise.name} ({self.target_sets}x{self.target_reps_min}-{self.target_reps_max})"


class WorkoutSession(models.Model):
    """A trainee's logged instance of one PlanSession on a given date."""

    trainee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"is_trainee": True},
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
    # Off-program substitution: the trainee did a different exercise than the
    # plan calls for (e.g. their usual equipment was unavailable), while
    # keeping the plan's own target sets/reps/rest - trainees can't edit the
    # plan itself (see CLAUDE.md), so this is a per-log override rather than a
    # PlanExercise change. Null means "did the planned exercise as normal".
    substituted_exercise = models.ForeignKey(
        Exercise, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    # Per-log superset override: which PlanExercise (in the same session) this
    # logged instance was paired with *today*, independent of the plan's own
    # PlanExercise.superset_with default - lets a trainee ad hoc pair/unpair
    # exercises for a single session (e.g. because they substituted one side
    # of the plan's own pairing). The frontend always resolves and saves the
    # effective value (falling back to the plan default when untouched), so
    # this is never ambiguous once a log is saved. Not enforced symmetric
    # server-side - it's a pure logging-UI concern with no effect on stored
    # history/PR data.
    superset_partner = models.ForeignKey(PlanExercise, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

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
