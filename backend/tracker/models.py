from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class DailyMetric(models.Model):
    class WeightUnit(models.TextChoices):
        KG = "kg", "kg"
        LB = "lb", "lb"

    trainee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"is_trainee": True},
        related_name="daily_metrics",
    )
    date = models.DateField()
    weight = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    weight_unit = models.CharField(max_length=2, choices=WeightUnit.choices, default=WeightUnit.KG)
    steps = models.PositiveIntegerField(null=True, blank=True)
    sleep_hours = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    sleep_quality = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    readiness = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    # The app has no existing volume-unit convention elsewhere, so this introduces
    # one: whole milliliters (see CLAUDE.md's Daily Tracker "water intake unit" note).
    water_intake_ml = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-date"]
        unique_together = ("trainee", "date")

    def __str__(self):
        return f"{self.trainee} - {self.date}"


class ActivityMET(models.Model):
    """MET (metabolic equivalent) reference value for a non-workout activity type,
    used by tracker.services.calculate_tdee to estimate calories burned. Open-write
    (any authenticated user) - same trust model as nutrition.DietaryTag: a trainee
    logging an activity that isn't listed yet needs to add it themselves rather than
    wait on a trainer. Corrections to a value after the fact go through Django admin -
    small, rarely-touched table, not a Bank needing full in-app CRUD."""

    name = models.CharField(max_length=100, unique=True)
    met_value = models.DecimalField(max_digits=4, decimal_places=1)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.met_value} MET)"


class ActivityLog(models.Model):
    trainee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"is_trainee": True},
        related_name="activity_logs",
    )
    date = models.DateField()
    activity_met = models.ForeignKey(ActivityMET, on_delete=models.PROTECT, related_name="activity_logs")
    duration_minutes = models.PositiveIntegerField()
    calories_burned = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.trainee} - {self.activity_met.name} ({self.date})"
