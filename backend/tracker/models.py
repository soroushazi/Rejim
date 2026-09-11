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


class ActivityLog(models.Model):
    trainee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"is_trainee": True},
        related_name="activity_logs",
    )
    date = models.DateField()
    activity_type = models.CharField(max_length=100)
    duration_minutes = models.PositiveIntegerField()
    calories_burned = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.trainee} - {self.activity_type} ({self.date})"
