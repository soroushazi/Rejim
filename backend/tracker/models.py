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
    # Movement metric only - never converted to calories (see
    # tracker/services.py::calculate_tdee and the revision note in
    # tdee-calculation-spec.md for why steps and active_energy_kcal aren't
    # both summed into the daily total).
    steps = models.PositiveIntegerField(null=True, blank=True)
    # The trainee's own device-reported daily Active Energy total (e.g.
    # Apple Watch's "Active Calories") - replaces our own step/workout-based
    # additive estimate in calculate_tdee's total, since a wearable's own
    # number already reconciles overlapping windows (e.g. a run that's both
    # a logged workout and part of that day's step count) the way ours
    # couldn't without double-counting.
    active_energy_kcal = models.PositiveIntegerField(null=True, blank=True)
    sleep_hours = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    # Time of day only (no date) - a bedtime naturally falls on "the previous
    # evening" relative to the DailyMetric's own date, but nothing here needs
    # that distinction since it's only ever used relative to itself (see
    # frontend lib/bedtime.ts's 8pm-based display scale for the Daily
    # Tracker/Recovery dashboard).
    bedtime = models.TimeField(null=True, blank=True)
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
    # Null/0 = doesn't generate steps (cycling, swimming, lifting, machine-based
    # cardio, ...); a positive value = this activity's approximate walking/running-gait
    # cadence, used by calculate_tdee to estimate and subtract the steps a logged
    # instance of it would have contributed to that day's step count, so they aren't
    # double-counted against NEAT (see tdee-calculation-spec.md's Tier 2).
    steps_per_minute = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)

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
