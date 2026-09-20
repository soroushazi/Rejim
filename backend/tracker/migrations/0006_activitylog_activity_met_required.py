import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tracker", "0005_backfill_activity_met"),
    ]

    operations = [
        migrations.AlterField(
            model_name="activitylog",
            name="activity_met",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="activity_logs",
                to="tracker.activitymet",
            ),
        ),
        migrations.RemoveField(
            model_name="activitylog",
            name="activity_type",
        ),
    ]
