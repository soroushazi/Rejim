from datetime import date, timedelta

from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.mixins import TraineeScopedQuerysetMixin
from accounts.models import User
from accounts.permissions import IsTraineeWriteTrainerReadOnly
from workouts.models import WorkoutSession

from .models import ActivityLog, DailyMetric
from .serializers import ActivityLogSerializer, DailyMetricSerializer


class DailyMetricViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = DailyMetric.objects.all()
    serializer_class = DailyMetricSerializer
    permission_classes = [IsTraineeWriteTrainerReadOnly]
    trainee_path = "trainee"

    def perform_create(self, serializer):
        serializer.save(trainee=self.request.user)


class ActivityLogViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = [IsTraineeWriteTrainerReadOnly]
    trainee_path = "trainee"

    def perform_create(self, serializer):
        serializer.save(trainee=self.request.user)


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        trainee_id = request.query_params.get("trainee_id")

        if user.role == User.Role.TRAINEE:
            if trainee_id and str(user.pk) != str(trainee_id):
                raise ValidationError("trainee_id must match your own account.")
            trainee = user
        else:
            if not trainee_id:
                raise ValidationError("trainee_id is required for trainers.")
            trainee = user.trainees.filter(pk=trainee_id).first()
            if trainee is None:
                raise ValidationError("trainee_id must be one of your own trainees.")

        end = self._parse_date(request.query_params.get("end"), default=date.today())
        start = self._parse_date(request.query_params.get("start"), default=end - timedelta(days=29))

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

    @staticmethod
    def _parse_date(value, default):
        if not value:
            return default
        try:
            return date.fromisoformat(value)
        except ValueError:
            raise ValidationError(f"Invalid date: {value!r}. Use YYYY-MM-DD.")
