from decimal import Decimal

from django.db import migrations

DEFAULT_MET = Decimal("4.0")


def backfill(apps, schema_editor):
    ActivityLog = apps.get_model("tracker", "ActivityLog")
    ActivityMET = apps.get_model("tracker", "ActivityMET")

    names = ActivityLog.objects.values_list("activity_type", flat=True).distinct()
    met_by_name = {}
    for name in names:
        if not name:
            continue
        met, _ = ActivityMET.objects.get_or_create(name=name, defaults={"met_value": DEFAULT_MET})
        met_by_name[name] = met

    for log in ActivityLog.objects.exclude(activity_type=""):
        log.activity_met_id = met_by_name[log.activity_type].id
        log.save(update_fields=["activity_met"])


def noop_reverse(apps, schema_editor):
    # Nothing to reverse - 0006 (which follows this migration) drops activity_type
    # entirely, so there's no text field left to backfill from on a reverse run
    # anyway. Rolling back past this point means restoring from a backup, not
    # migrating backwards.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("tracker", "0004_activitymet_activitylog_activity_met"),
    ]

    operations = [
        migrations.RunPython(backfill, noop_reverse),
    ]
