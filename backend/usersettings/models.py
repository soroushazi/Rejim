from django.conf import settings
from django.db import models


class Goal(models.Model):
    class GoalType(models.TextChoices):
        WEIGHT = "weight", "Weight"
        STRENGTH = "strength", "Strength"

    class Direction(models.TextChoices):
        LOSE = "lose", "Lose"
        GAIN = "gain", "Gain"
        MAINTAIN = "maintain", "Maintain"

    class WeightUnit(models.TextChoices):
        KG = "kg", "kg"
        LB = "lb", "lb"

    trainee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"is_trainee": True},
        related_name="goals",
    )
    goal_type = models.CharField(max_length=10, choices=GoalType.choices)

    # Weight-goal fields.
    target_weight = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    target_weight_unit = models.CharField(max_length=2, choices=WeightUnit.choices, null=True, blank=True)
    direction = models.CharField(max_length=10, choices=Direction.choices, null=True, blank=True)

    # Strength-goal fields.
    exercise = models.ForeignKey(
        "workouts.Exercise", on_delete=models.PROTECT, null=True, blank=True, related_name="goals"
    )
    target_value = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    target_value_unit = models.CharField(max_length=2, choices=WeightUnit.choices, null=True, blank=True)

    target_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    # Internal - dedupes the "goal reached" notification so it only fires once.
    # Goals stay active indefinitely once reached (no auto-archive), see CLAUDE.md.
    completion_notified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.trainee} - {self.get_goal_type_display()} goal"


class UserPreference(models.Model):
    class WeightUnit(models.TextChoices):
        KG = "kg", "kg"
        LB = "lb", "lb"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="preference")
    default_weight_unit = models.CharField(max_length=2, choices=WeightUnit.choices, default=WeightUnit.KG)

    def __str__(self):
        return f"Preferences ({self.user})"


class ReminderSetting(models.Model):
    class ReminderType(models.TextChoices):
        WEIGHT = "weight", "Weight"
        SLEEP = "sleep", "Sleep"
        DIET_LOG = "diet_log", "Diet log"
        WORKOUT_LOG = "workout_log", "Workout log"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reminder_settings")
    reminder_type = models.CharField(max_length=15, choices=ReminderType.choices)
    is_enabled = models.BooleanField(default=True)
    time_of_day = models.TimeField()
    channel_in_app = models.BooleanField(default=True)
    channel_push = models.BooleanField(default=False)
    channel_banner = models.BooleanField(default=False)
    # Toggle is shown in the UI now but inert until email delivery is built -
    # see CLAUDE.md's Future Tasks.
    channel_email = models.BooleanField(default=False)
    # Internal - dedupes firing to once per calendar day.
    last_fired_date = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "reminder_type")
        ordering = ["reminder_type"]

    def __str__(self):
        return f"{self.user} - {self.get_reminder_type_display()} reminder"


class Notification(models.Model):
    class Kind(models.TextChoices):
        REMINDER = "reminder", "Reminder"
        GOAL_COMPLETION = "goal_completion", "Goal completion"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField(max_length=20, choices=Kind.choices)
    title = models.CharField(max_length=255)
    body = models.CharField(max_length=500, blank=True)
    reminder = models.ForeignKey(
        ReminderSetting, on_delete=models.SET_NULL, null=True, blank=True, related_name="deliveries"
    )
    goal = models.ForeignKey(Goal, on_delete=models.SET_NULL, null=True, blank=True, related_name="notifications")
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    # Whether this has already been surfaced as a one-time login banner.
    banner_shown = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.user})"


class PushSubscription(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="push_subscriptions")
    endpoint = models.URLField(max_length=500, unique=True)
    p256dh = models.CharField(max_length=255)
    auth = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Push subscription ({self.user})"
