from datetime import date, timedelta

from django.db.models import Q
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.mixins import TraineeScopedQuerysetMixin
from accounts.permissions import IsTraineeWriteTrainerReadOnly
from nutrition.models import FoodLog
from nutrition.services import sum_nutrients
from workouts.models import WorkoutSession

from .models import ActivityLog, ActivityMET, DailyMetric
from .serializers import ActivityLogSerializer, ActivityMETSerializer, DailyMetricSerializer
from .services import calculate_tdee


def _resolve_trainee(request):
    """Same rule used by every trainee-scoped aggregation endpoint: an explicit
    ?trainee_id= always means "one of my own trainees" (checked against the
    real trainer FK, so this can't be used to read anyone else's data);
    omitting it means "myself," which requires is_trainee. This presence-first
    rule (rather than branching on the requester's own capability flags) is
    what lets a dual-role account use the same endpoint both ways - see
    accounts/mixins.py::TraineeScopedQuerysetMixin for the same pattern."""
    user = request.user
    trainee_id = request.query_params.get("trainee_id")

    if trainee_id:
        trainee = user.trainees.filter(pk=trainee_id).first()
        if trainee is None:
            raise ValidationError("trainee_id must be one of your own trainees.")
        return trainee

    if user.is_trainee:
        return user
    raise ValidationError("trainee_id is required for trainers.")


def _parse_date(value, default):
    if not value:
        return default
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise ValidationError(f"Invalid date: {value!r}. Use YYYY-MM-DD.")


class DailyMetricViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = DailyMetric.objects.all()
    serializer_class = DailyMetricSerializer
    permission_classes = [IsTraineeWriteTrainerReadOnly]
    trainee_path = "trainee"

    def get_queryset(self):
        queryset = super().get_queryset()
        date_param = self.request.query_params.get("date")
        if date_param:
            queryset = queryset.filter(date=date_param)
        return queryset


class ActivityMETViewSet(viewsets.ModelViewSet):
    """Open-write reference data (same trust model as nutrition.DietaryTag) - list +
    create only in practice (no frontend path calls update/destroy; corrections go
    through Django admin), but plain ModelViewSet costs nothing extra to expose."""

    queryset = ActivityMET.objects.all()
    serializer_class = ActivityMETSerializer


class ActivityLogViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = [IsTraineeWriteTrainerReadOnly]
    trainee_path = "trainee"

    def get_queryset(self):
        queryset = super().get_queryset()
        date_param = self.request.query_params.get("date")
        if date_param:
            queryset = queryset.filter(date=date_param)
        return queryset

    def perform_create(self, serializer):
        serializer.save(trainee=self.request.user)


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        trainee = _resolve_trainee(request)

        end = _parse_date(request.query_params.get("end"), default=date.today())
        start = _parse_date(request.query_params.get("start"), default=end - timedelta(days=29))

        daily_metrics = DailyMetric.objects.filter(trainee=trainee, date__gte=start, date__lte=end)
        session_dates = (
            WorkoutSession.objects.filter(trainee=trainee, date__gte=start, date__lte=end)
            .order_by("date")
            .values_list("date", flat=True)
            .distinct()
        )

        return Response(
            {
                "trainee": trainee.id,
                "start": start,
                "end": end,
                "daily_metrics": DailyMetricSerializer(daily_metrics, many=True).data,
                "workout_session_dates": list(session_dates),
            }
        )


class DailySummaryView(APIView):
    """Read-side rollup for one date: calories/macros consumed (Diet tab food
    logs), calories burned (an estimated TDEE from the trainee's body stats,
    plus logged workouts and ActivityLog entries - see tracker/services.py),
    net balance, and the trainee's diet plan target for a planned-vs-actual
    comparison. Computed on request, never stored, since the underlying logs
    can be edited after the fact."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        trainee = _resolve_trainee(request)
        target_date = _parse_date(request.query_params.get("date"), default=date.today())

        food_logs = FoodLog.objects.filter(trainee=trainee).filter(
            Q(logged_meal__date=target_date) | Q(logged_meal__isnull=True, logged_at__date=target_date)
        )
        consumed = sum_nutrients([log.actual_nutrients() for log in food_logs])

        calories_out = calculate_tdee(trainee, target_date, consumed_calories=consumed["calories"])
        calories_burned = calories_out["total"]
        net_calories = (consumed["calories"] or 0) - calories_burned

        diet_plan = trainee.diet_plans.first()
        planned = diet_plan.average_daily_nutrients() if diet_plan else None

        return Response(
            {
                "date": target_date,
                "trainee": trainee.id,
                "consumed": consumed,
                "planned": planned,
                "calories_burned": calories_burned,
                "calories_burned_breakdown": calories_out,
                "net_calories": net_calories,
            }
        )
