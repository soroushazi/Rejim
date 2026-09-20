import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tracker", "0003_alter_activitylog_trainee_alter_dailymetric_trainee"),
    ]

    operations = [
        migrations.CreateModel(
            name="ActivityMET",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100, unique=True)),
                ("met_value", models.DecimalField(decimal_places=1, max_digits=4)),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.AddField(
            model_name="activitylog",
            name="activity_met",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="activity_logs",
                to="tracker.activitymet",
            ),
        ),
    ]
