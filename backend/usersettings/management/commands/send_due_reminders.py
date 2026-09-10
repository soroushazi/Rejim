from django.core.management.base import BaseCommand
from django.utils import timezone

from usersettings.models import Notification, ReminderSetting
from usersettings.services import REMINDER_COPY, check_goal_completions, notify


class Command(BaseCommand):
    """Cron entrypoint for Stage 1 reminder/goal-completion delivery - intended
    to run periodically (e.g. every few minutes) via a plain OS cron entry.
    See CLAUDE.md's Future Tasks for the planned move to a real task queue."""

    help = "Sends any reminders whose time has passed today and haven't fired yet, then checks goal completions."

    def handle(self, *args, **options):
        now = timezone.localtime()
        due = ReminderSetting.objects.filter(is_enabled=True, time_of_day__lte=now.time()).exclude(
            last_fired_date=now.date()
        )
        fired = 0
        for reminder in due:
            title, body = REMINDER_COPY[reminder.reminder_type]
            notify(reminder.user, Notification.Kind.REMINDER, title, body, reminder=reminder)
            reminder.last_fired_date = now.date()
            reminder.save(update_fields=["last_fired_date"])
            fired += 1

        check_goal_completions()
        self.stdout.write(self.style.SUCCESS(f"Fired {fired} reminder(s); checked goal completions."))
