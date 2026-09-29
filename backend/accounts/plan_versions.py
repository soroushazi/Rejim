"""Effective-dated plan versions, shared by DietPlan and WorkoutPlan.

A trainee's plan is a series of versions (one DietPlan/WorkoutPlan row each):

- draft      effective_from is null - being edited, invisible to the trainee
- scheduled  effective_from is in the future - still editable, the trainee
             sees a notice + read-only preview
- active     the latest version whose effective_from <= today
- past       superseded, kept forever so logged history stays linked to the
             exact plan it was logged against

At most one draft-or-scheduled ("pending") version exists per trainee per plan
type. Only pending versions can be edited; a trainer changes a live plan by
starting a draft copy of it (`edit`) and publishing that copy (`publish`),
either immediately or from a chosen start date.

Which version a given *day* uses (plan_for_date) has one extra rule: a day the
trainee has already started logging stays on the version it started with, so
publishing "immediately" mid-day never swaps the plan out from under meals or a
session already logged that day - the new version takes over from the next day
the trainee hasn't touched yet.
"""

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from connection.services import log_plan_change

LOCKED_MESSAGE = (
    "This version of the plan is already in effect and can't be changed. "
    "Start an edit to create a new version instead."
)


def today():
    return timezone.localdate()


def is_editable(plan):
    return plan.effective_from is None or plan.effective_from > today()


def format_date(d):
    return f"{d:%b} {d.day}, {d.year}"


def plan_status(plan):
    if plan.effective_from is None:
        return "draft"
    if plan.effective_from > today():
        return "scheduled"
    active = version_in_effect(type(plan).objects.filter(trainee_id=plan.trainee_id), today())
    return "active" if active and active.id == plan.id else "past"


def version_in_effect(versions, on_date):
    """The latest published version whose start date is on or before on_date.
    Ties (two versions published for the same day) go to the later publish."""
    return versions.filter(effective_from__lte=on_date).order_by("-effective_from", "-published_at", "-id").first()


def pending_version(versions):
    return versions.filter(Q(effective_from__isnull=True) | Q(effective_from__gt=today())).first()


def plan_for_date(versions, on_date, started_plan_ids):
    """The version a given day uses: the one that day's existing logs already
    point at (if the trainee has started logging it), else the one in effect."""
    started_plan_ids = [pid for pid in started_plan_ids if pid is not None]
    if started_plan_ids:
        started = versions.filter(id__in=started_plan_ids).order_by("-published_at", "-id").first()
        if started:
            return started
    return version_in_effect(versions, on_date)


class PlanVersionLockMixin:
    """Rejects writes to any plan-structure row whose version is already in
    effect (or past), and skips PlanChangeLog noise while a version is still an
    unpublished draft. Mix in *before* PlanChangeLoggingMixin; implement
    `_plan_of(instance)` returning the DietPlan/WorkoutPlan the row belongs to."""

    def _plan_of(self, instance):
        raise NotImplementedError

    def _check_editable(self, instance):
        if not is_editable(self._plan_of(instance)):
            raise ValidationError({"detail": LOCKED_MESSAGE})

    def _should_log_change(self, instance):
        return self._plan_of(instance).effective_from is not None

    def perform_create(self, serializer):
        # The new row's plan is only known once it's saved (it may hang several
        # FKs below the plan) - save, check, and roll back if it's locked.
        with transaction.atomic():
            super().perform_create(serializer)
            self._check_editable(serializer.instance)

    def perform_update(self, serializer):
        self._check_editable(serializer.instance)
        with transaction.atomic():
            super().perform_update(serializer)
            self._check_editable(serializer.instance)

    def perform_destroy(self, instance):
        self._check_editable(instance)
        super().perform_destroy(instance)


class PlanVersionViewSetMixin(PlanVersionLockMixin):
    """The versioning endpoints on DietPlanViewSet/WorkoutPlanViewSet. Set
    `detail_serializer_class`, `plan_label` ("diet plan"/"workout plan"), and
    implement `_versions(trainee)`, `_started_plan_ids(trainee, date)` and
    `_copy_version(plan)`."""

    detail_serializer_class = None
    plan_label = "plan"

    def _plan_of(self, instance):
        return instance

    def _versions(self, trainee):
        raise NotImplementedError

    def _started_plan_ids(self, trainee, on_date):
        raise NotImplementedError

    def _copy_version(self, plan):
        raise NotImplementedError

    def _named_trainee(self, value):
        """A trainee the requester trains, named by id (?trainee_id= or body)."""
        return get_object_or_404(self.request.user.trainees.all(), pk=value)

    def get_queryset(self):
        queryset = super().get_queryset()
        # A trainee never sees their trainer's unpublished drafts (a scheduled
        # version stays visible - that's the "preview upcoming plan" feature).
        if not self.request.query_params.get("trainee_id"):
            queryset = queryset.exclude(trainee=self.request.user, effective_from__isnull=True)
        return queryset

    def perform_create(self, serializer):
        # A brand-new plan starts as a draft, and only if there's no other
        # pending version to collide with.
        trainee = serializer.validated_data["trainee"]
        if pending_version(self._versions(trainee)):
            raise ValidationError({"detail": "This trainee already has an unpublished or scheduled plan version."})
        serializer.save()

    def perform_destroy(self, instance):
        # Discarding a draft, or cancelling a scheduled change. A version that's
        # already in effect is history and can never be deleted.
        self._check_editable(instance)
        if instance.effective_from is not None:
            log_plan_change(
                instance.trainee,
                self.request.user,
                self.plan_type,
                f"Cancelled the change scheduled for {format_date(instance.effective_from)}",
            )
        instance.delete()

    @action(detail=False, methods=["get"], url_path="for-date")
    def for_date(self, request):
        """{plan, upcoming}: the version a given day uses (full detail), plus
        the scheduled next version if any (summary only)."""
        trainee_id = request.query_params.get("trainee_id")
        trainee = self._named_trainee(trainee_id) if trainee_id else request.user
        on_date = parse_date(request.query_params.get("date") or "") or today()
        versions = self._versions(trainee)
        plan = plan_for_date(versions, on_date, self._started_plan_ids(trainee, on_date))
        upcoming = versions.filter(effective_from__gt=today()).order_by("effective_from").first()
        context = self.get_serializer_context()
        return Response(
            {
                "plan": self.detail_serializer_class(plan, context=context).data if plan else None,
                "upcoming": self.get_serializer_class()(upcoming, context=context).data if upcoming else None,
            }
        )

    @action(detail=False, methods=["post"])
    def edit(self, request):
        """Returns the trainee's pending (draft/scheduled) version to edit,
        creating a draft copy of the version in effect today if there's none."""
        trainee = self._named_trainee(request.data.get("trainee"))
        versions = self._versions(trainee)
        with transaction.atomic():
            plan = pending_version(versions)
            if plan is None:
                current = version_in_effect(versions, today())
                if current is None:
                    return Response({"detail": "No plan to edit yet."}, status=status.HTTP_400_BAD_REQUEST)
                plan = self._copy_version(current)
        return Response(self.detail_serializer_class(plan, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        """Publishes a pending version from `effective_from` (a date; today or
        later), or moves an already-scheduled one to a new start date."""
        plan = self.get_object()
        self._check_editable(plan)
        effective_from = parse_date(request.data.get("effective_from") or "")
        if effective_from is None:
            raise ValidationError({"effective_from": "A start date is required."})
        # The client sends its own local "today" for "Immediately", which can
        # lag the server's date by up to a day across timezones - clamp that
        # rather than reject it.
        if effective_from < today():
            if (today() - effective_from).days > 1:
                raise ValidationError({"effective_from": "The start date can't be in the past."})
            effective_from = today()

        was_scheduled = plan.effective_from is not None
        plan.effective_from = effective_from
        plan.published_at = timezone.now()
        plan.save(update_fields=["effective_from", "published_at"])

        if effective_from == today():
            summary = f"Published a new version of the {self.plan_label}, effective immediately"
        elif was_scheduled:
            summary = f"Moved the scheduled {self.plan_label} change to {format_date(effective_from)}"
        else:
            summary = f"Scheduled a new version of the {self.plan_label} to start {format_date(effective_from)}"
        log_plan_change(plan.trainee, request.user, self.plan_type, summary)
        return Response(self.detail_serializer_class(plan, context=self.get_serializer_context()).data)
