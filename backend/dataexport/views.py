import csv
from datetime import date, timedelta

from django.db.models import Q
from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from nutrition.models import FoodLog
from tracker.models import ActivityLog, DailyMetric
from tracker.views import _parse_date
from workouts.models import LoggedSet


def _resolve_range(request):
    end = _parse_date(request.query_params.get("end"), default=date.today())
    start = _parse_date(request.query_params.get("start"), default=end - timedelta(days=29))
    return start, end


def _csv_response(filename):
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def _food_log_item_name(log):
    if log.reference_meal_item_id:
        return log.reference_meal_item.food_item.name
    if log.food_item_id:
        return log.food_item.name
    return log.quick_log_item.name


class DietLogExportView(APIView):
    """CSV of the caller's own FoodLog entries in range - no trainee_id/trainer
    branch, this exports "my own logged data" only, matching every other
    export endpoint in this app."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        start, end = _resolve_range(request)
        logs = (
            FoodLog.objects.filter(trainee=request.user)
            .filter(
                Q(logged_meal__date__range=(start, end))
                | Q(logged_meal__isnull=True, logged_at__date__range=(start, end))
            )
            .select_related("logged_meal__reference_meal", "reference_meal_item__food_item", "food_item", "quick_log_item")
            .order_by("logged_at")
        )

        response = _csv_response("diet-log.csv")
        writer = csv.writer(response)
        writer.writerow(
            ["date", "meal", "item", "actual_weight_grams", "calories", "protein_g", "carbs_g", "fat_g"]
        )
        for log in logs:
            day = log.logged_meal.date if log.logged_meal_id else log.logged_at.date()
            meal = log.logged_meal.reference_meal.label if log.logged_meal_id else ""
            writer.writerow(
                [
                    day,
                    meal,
                    _food_log_item_name(log),
                    log.actual_weight_grams,
                    log.calories,
                    log.protein_g,
                    log.carbs_g,
                    log.fat_g,
                ]
            )
        return response


class WorkoutLogExportView(APIView):
    """CSV of the caller's own logged sessions/sets in range, one row per set."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        start, end = _resolve_range(request)
        sets = (
            LoggedSet.objects.filter(
                logged_exercise__session__trainee=request.user,
                logged_exercise__session__date__range=(start, end),
            )
            .select_related("logged_exercise__session__plan_session", "logged_exercise__plan_exercise__exercise")
            .order_by("logged_exercise__session__date", "logged_exercise__order", "set_number")
        )

        response = _csv_response("workout-log.csv")
        writer = csv.writer(response)
        writer.writerow(
            [
                "date",
                "session",
                "exercise",
                "set_number",
                "weight",
                "weight_unit",
                "reps_done",
                "rest_seconds",
                "is_warmup",
                "rpe",
            ]
        )
        for s in sets:
            session = s.logged_exercise.session
            writer.writerow(
                [
                    session.date,
                    session.plan_session.label,
                    s.logged_exercise.plan_exercise.exercise.name,
                    s.set_number,
                    s.weight,
                    s.weight_unit,
                    s.reps_done,
                    s.rest_seconds,
                    s.is_warmup,
                    s.rpe,
                ]
            )
        return response


class DailyMetricsExportView(APIView):
    """CSV combining the caller's own DailyMetric and ActivityLog rows in
    range - different shapes, so rows are tagged with a row_type column
    (matches the spec's single endpoint for both)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        start, end = _resolve_range(request)

        response = _csv_response("daily-metrics.csv")
        writer = csv.writer(response)
        writer.writerow(
            [
                "row_type",
                "date",
                "weight",
                "weight_unit",
                "steps",
                "sleep_hours",
                "sleep_quality",
                "readiness",
                "water_intake_ml",
                "activity_type",
                "duration_minutes",
                "calories_burned",
                "notes",
            ]
        )
        for m in DailyMetric.objects.filter(trainee=request.user, date__range=(start, end)).order_by("date"):
            writer.writerow(
                [
                    "metric",
                    m.date,
                    m.weight,
                    m.weight_unit,
                    m.steps,
                    m.sleep_hours,
                    m.sleep_quality,
                    m.readiness,
                    m.water_intake_ml,
                    "",
                    "",
                    "",
                    m.notes,
                ]
            )
        for a in ActivityLog.objects.filter(trainee=request.user, date__range=(start, end)).order_by("date"):
            writer.writerow(
                ["activity", a.date, "", "", "", "", "", "", "", a.activity_type, a.duration_minutes, a.calories_burned, a.notes]
            )
        return response
