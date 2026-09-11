from django.db import migrations


def forwards(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.filter(role="trainer").update(is_trainer=True)
    User.objects.filter(role="trainee").update(is_trainee=True)


def backwards(apps, schema_editor):
    # Best-effort: a dual-role row (set up after this migration ran forward)
    # has no single `role` to restore to - trainer wins arbitrarily.
    User = apps.get_model("accounts", "User")
    User.objects.filter(is_trainee=True).update(role="trainee")
    User.objects.filter(is_trainer=True).update(role="trainer")


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0005_user_is_trainee_is_trainer"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
