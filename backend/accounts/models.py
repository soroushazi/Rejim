from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        TRAINER = "trainer", "Trainer"
        TRAINEE = "trainee", "Trainee"

    role = models.CharField(max_length=10, choices=Role.choices)
    trainer = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        limit_choices_to={"role": Role.TRAINER},
        related_name="trainees",
    )

    def __str__(self):
        return self.username
