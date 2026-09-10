from datetime import date, timedelta

from django.db.models import Q, Sum
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.mixins import TraineeScopedQuerysetMixin
from accounts.models import User
from accounts.permissions import IsTraineeWriteTrainerReadOnly
from nutrition.models import FoodLog
from nutrition.services import sum_nutrients
from workouts.models import WorkoutSession

from .models import ActivityLog, DailyMetric
from .serializers import ActivityLogSerializer, DailyMetricSerializer


def _resolve_trainee(request):
    """Same rule used by every trainee-scoped aggregation endpoint: a trainee
    can only ever ask about themselves, a trainer must name one of their own."""
    user = request.user
    trainee_id = request.query_params.get("trainee_id")

    if user.role == User.Role.TRAINEE:
        if trainee_id and str(user.pk) != str(trainee_id):
            raise ValidationError("trainee_id must match your own account.")
        return user

    if not trainee_id:
        raise ValidationError("trainee_id is required for trainers.")
    trainee = user.trainees.filter(pk=trainee_id).first()
    if trainee is None:
        raise ValidationError("trainee_id must be one of your own trainees.")
    return trainee


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
    logs), calories burned (ActivityLog entries - WorkoutSession carries no
    calorie field in Stage 1, see CLAUDE.md), net balance, and the trainee's
    diet plan target for a planned-vs-actual comparison. Computed on request,
    never stored, since the underlying logs can be edited after the fact."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        trainee = _resolve_trainee(request)
        target_date = _parse_date(request.query_params.get("date"), default=date.today())

        food_logs = FoodLog.objects.filter(trainee=trainee).filter(
            Q(logged_meal__date=target_date) | Q(logged_meal__isnull=True, logged_at__date=target_date)
        )
        consumed = sum_nutrients([log.actual_nutrients() for log in food_logs])

        calories_burned = (
            ActivityLog.objects.filter(trainee=trainee, date=target_date).aggregate(total=Sum("calories_burned"))[
                "total"
            ]
            or 0
        )
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
                "net_calories": net_calories,
            }
        )
