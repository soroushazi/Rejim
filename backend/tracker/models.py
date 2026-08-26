from django.conf import settings
from django.db import models


class DailyMetric(models.Model):
    class WeightUnit(models.TextChoices):
        KG = "kg", "kg"
        LB = "lb", "lb"

    trainee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "trainee"},
        related_name="daily_metrics",
    )
    date = models.DateField()
    weight = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    weight_unit = models.CharField(max_length=2, choices=WeightUnit.choices, default=WeightUnit.KG)
    steps = models.PositiveIntegerField(null=True, blank=True)
    sleep_hours = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ["-date"]
        unique_together = ("trainee", "date")

    def __str__(self):
        return f"{self.trainee} - {self.date}"


class ActivityLog(models.Model):
    trainee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "trainee"},
        related_name="activity_logs",
    )
    date = models.DateField()
    activity_type = models.CharField(max_length=100)
    duration_minutes = models.PositiveIntegerField()

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.trainee} - {self.activity_type} ({self.date})"
