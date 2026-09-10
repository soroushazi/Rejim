from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        TRAINER = "trainer", "Trainer"
        TRAINEE = "trainee", "Trainee"

    class WeightUnit(models.TextChoices):
        KG = "kg", "kg"
        LB = "lb", "lb"

    class GymLocation(models.TextChoices):
        HOME = "home", "Home gym"
        COMMERCIAL = "commercial", "Commercial gym"
        OUTDOOR = "outdoor", "Outdoor / park"
        NONE = "none", "No gym (bodyweight only)"

    class ExperienceLevel(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"

    role = models.CharField(max_length=10, choices=Role.choices)
    trainer = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        limit_choices_to={"role": Role.TRAINER},
        related_name="trainees",
    )

    # Onboarding / body stats (trainee-only in practice, not role-enforced at
    # the model level - see accounts/services.py for how these feed BMI and
    # Goal's "starting point" resolution).
    height_cm = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    age = models.PositiveSmallIntegerField(null=True, blank=True)
    starting_weight = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    starting_weight_unit = models.CharField(max_length=2, choices=WeightUnit.choices, default=WeightUnit.KG)

    # Onboarding preferences - captured for future Diet/Workout plan-authoring
    # UI to consume once it's built; not surfaced to trainers yet (see
    # CLAUDE.md's Build Order - trainer-side plan authoring isn't built).
    meal_preferences = models.ManyToManyField("nutrition.DietaryTag", blank=True, related_name="users_preferring")
    meal_preferences_notes = models.TextField(blank=True)
    workout_days_per_week = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(7)]
    )
    workout_session_minutes = models.PositiveSmallIntegerField(null=True, blank=True)
    gym_location = models.CharField(max_length=12, choices=GymLocation.choices, null=True, blank=True)
    experience_level = models.CharField(max_length=15, choices=ExperienceLevel.choices, null=True, blank=True)
    injury_notes = models.TextField(blank=True)

    # Set only when the trainee explicitly dismisses the onboarding banner -
    # never implicitly on a partial profile save.
    onboarding_completed = models.BooleanField(default=False)

    def __str__(self):
        return self.username
