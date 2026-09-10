from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsTrainer

from .services import (
    CONSISTENCY_LOW_THRESHOLD_PCT,
    compute_consistency_pct,
    compute_last_active,
    compute_weight_trend,
)


class TraineeListView(APIView):
    """The trainer's home-screen roster - GET /api/trainer/trainees/. Computed
    per-trainee in Python (a trainer's roster is small at this app's Stage 1
    scale), mirroring progress/views.py's existing "loop over a small
    queryset" convention rather than a complex ORM aggregation."""

    permission_classes = [IsAuthenticated, IsTrainer]

    def get(self, request):
        trainees = request.user.trainees.all()

        search = request.query_params.get("search")
        if search:
            trainees = trainees.filter(
                Q(username__icontains=search) | Q(first_name__icontains=search) | Q(last_name__icontains=search)
            )

        trend_filter = request.query_params.get("trend")
        low_consistency = request.query_params.get("low_consistency") == "true"
        inactive_days_param = request.query_params.get("inactive_days")
        inactive_days = int(inactive_days_param) if inactive_days_param else None

        rows = []
        for trainee in trainees:
            trend = compute_weight_trend(trainee)
            consistency_pct = compute_consistency_pct(trainee)
            last_active = compute_last_active(trainee)

            if trend_filter and trend != trend_filter:
                continue
            if low_consistency and consistency_pct >= CONSISTENCY_LOW_THRESHOLD_PCT:
                continue
            if inactive_days is not None:
                cutoff = timezone.localdate() - timedelta(days=inactive_days)
                if last_active is not None and last_active >= cutoff:
                    continue

            rows.append(
                {
                    "id": trainee.id,
                    "username": trainee.username,
                    "first_name": trainee.first_name,
                    "last_name": trainee.last_name,
                    "weight_trend": trend,
                    "consistency_pct": consistency_pct,
                    "last_active": last_active,
                }
            )

        return Response(rows)
