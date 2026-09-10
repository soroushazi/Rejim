from django.conf import settings
from django.db import models


class QAThread(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        ANSWERED = "answered", "Answered"
        ARCHIVED = "archived", "Archived"

    trainee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "trainee"},
        related_name="qa_threads",
    )
    subject = models.CharField(max_length=255)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.subject} ({self.trainee})"


class QAMessage(models.Model):
    thread = models.ForeignKey(QAThread, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="qa_messages")
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.thread} - {self.sender}"


class TrainerNote(models.Model):
    trainee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "trainee"},
        related_name="trainer_notes",
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Note to {self.trainee} ({self.created_at:%Y-%m-%d})"


class TrainerConnection(models.Model):
    """A trainee's one-time, onboarding-wizard request to be connected to a
    trainer. Distinct from QAThread/TrainerNote above, which assume an
    *existing* trainee-trainer relationship - this is the intake record for
    getting one in the first place. Stage 1 has no automated matching or
    trainer-side acceptance flow, so assignment is a manual admin action
    (see save() below) - see LOGIN_ONBOARDING_SPEC.md."""

    class Option(models.TextChoices):
        NO_PREFERENCE = "no_preference", "No preference"
        SPECIFIC_TRAINER = "specific_trainer", "Specific trainer"
        TRAIN_MYSELF = "train_myself", "Train myself"

    class Status(models.TextChoices):
        PENDING = "pending_manual_assignment", "Pending manual assignment"
        ACTIVE = "active", "Active"
        NOT_APPLICABLE = "not_applicable", "Not applicable"

    trainee = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "trainee"},
        related_name="trainer_connection",
    )
    option_selected = models.CharField(max_length=20, choices=Option.choices)
    requested_trainer_name = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING)
    assigned_trainer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={"role": "trainer"},
        related_name="pending_trainer_connections",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.trainee} - {self.get_option_selected_display()} ({self.status})"

    def save(self, *args, **kwargs):
        # Makes manual assignment a single admin action: setting
        # assigned_trainer here also wires up the real Trainee.trainer FK
        # everything else in the app keys off, and flips status to active -
        # otherwise an admin would have to separately edit the User record too.
        if self.assigned_trainer_id and self.status == self.Status.PENDING:
            self.status = self.Status.ACTIVE
        super().save(*args, **kwargs)
        if self.assigned_trainer_id and self.trainee.trainer_id != self.assigned_trainer_id:
            self.trainee.trainer = self.assigned_trainer
            self.trainee.save(update_fields=["trainer"])
