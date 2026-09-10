import json
from decimal import Decimal

from django.conf import settings
from django.utils import timezone

from progress.services import to_kg
from tracker.models import DailyMetric
from workouts.models import LoggedSet

from .models import Goal, Notification, PushSubscription

REMINDER_COPY = {
    "weight": ("Weight reminder", "Don't forget to log today's weight."),
    "sleep": ("Sleep reminder", "Don't forget to log last night's sleep."),
    "diet_log": ("Diet log reminder", "Don't forget to log your meals today."),
    "workout_log": ("Workout reminder", "Don't forget to log today's workout."),
}

# No spec-defined tolerance for "maintain" - a small fixed band is the
# simplest reasonable reading of "stayed at target."
MAINTAIN_TOLERANCE_KG = Decimal("1")


def send_web_push(subscription: PushSubscription, title: str, body: str):
    """Best-effort - a delivery failure (stale subscription, unreachable push
    service, bad keys) must never abort the reminder command that called this
    for every other user/reminder, so every exception is swallowed here."""
    from pywebpush import WebPushException, webpush

    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
            },
            data=json.dumps({"title": title, "body": body}),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_SUBJECT},
        )
    except WebPushException as exc:
        response = getattr(exc, "response", None)
        if response is not None and response.status_code in (404, 410):
            # Expired/unregistered subscription - stop trying it.
            subscription.delete()
    except Exception:
        pass


def notify(user, kind, title, body, *, reminder=None, goal=None):
    """Creates the in-app Notification row (also the banner/push source) and
    sends a real Web Push if the user has channel_push on (for a reminder) or
    has any subscription at all (for a goal completion, which has no
    per-channel config - see usersettings/models.py::Notification)."""
    notification = Notification.objects.create(
        user=user,
        kind=kind,
        title=title,
        body=body,
        reminder=reminder,
        goal=goal,
        # Goal completions always get a banner; a reminder's banner_shown
        # starts True (i.e. "already shown") when channel_banner is off.
        banner_shown=(not reminder.channel_banner) if reminder else False,
    )

    should_push = reminder.channel_push if reminder else True
    if should_push:
        for subscription in PushSubscription.objects.filter(user=user):
            send_web_push(subscription, title, body)

    return notification


def check_goal_completions():
    for goal in Goal.objects.filter(is_active=True, completion_notified_at__isnull=True):
        reached = _weight_goal_reached(goal) if goal.goal_type == Goal.GoalType.WEIGHT else _strength_goal_reached(goal)
        if reached:
            notify(
                goal.trainee,
                Notification.Kind.GOAL_COMPLETION,
                "Goal reached!",
                _goal_description(goal),
                goal=goal,
            )
            goal.completion_notified_at = timezone.now()
            goal.save(update_fields=["completion_notified_at"])


def _weight_goal_reached(goal):
    latest = DailyMetric.objects.filter(trainee=goal.trainee, weight__isnull=False).order_by("-date").first()
    if latest is None:
        return False
    current_kg = to_kg(latest.weight, latest.weight_unit)
    target_kg = to_kg(goal.target_weight, goal.target_weight_unit)
    if goal.direction == Goal.Direction.LOSE:
        return current_kg <= target_kg
    if goal.direction == Goal.Direction.GAIN:
        return current_kg >= target_kg
    return abs(current_kg - target_kg) <= MAINTAIN_TOLERANCE_KG


def _strength_goal_reached(goal):
    best = (
        LoggedSet.objects.filter(
            logged_exercise__plan_exercise__exercise=goal.exercise,
            logged_exercise__session__trainee=goal.trainee,
            is_warmup=False,
        )
        .order_by("-weight")
        .first()
    )
    if best is None:
        return False
    best_kg = to_kg(best.weight, best.weight_unit)
    target_kg = to_kg(goal.target_value, goal.target_value_unit)
    return best_kg >= target_kg


def _goal_description(goal):
    if goal.goal_type == Goal.GoalType.WEIGHT:
        return f"You reached your target weight of {goal.target_weight}{goal.target_weight_unit}."
    return f"You reached your target of {goal.target_value}{goal.target_value_unit} on {goal.exercise.name}."
