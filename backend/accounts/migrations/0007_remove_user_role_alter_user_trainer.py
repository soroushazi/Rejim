import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_backfill_role_flags"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="user",
            name="role",
        ),
        migrations.AlterField(
            model_name="user",
            name="trainer",
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={"is_trainer": True},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="trainees",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
