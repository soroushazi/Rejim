from datetime import date, timedelta

from django.db.models import Count, Sum
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from tracker.models import ActivityLog, DailyMetric
from tracker.views import _parse_date, _resolve_trainee
from workouts.models import LoggedSet, WorkoutSession

from .services import diet_adherence_pct, food_logs_by_day, monday_of, to_kg


def _resolve_range(request):
    end = _parse_date(request.query_params.get("end"), default=date.today())
    start = _parse_date(request.query_params.get("start"), default=end - timedelta(days=29))
    if start > end:
        raise ValidationError("start must not be after end.")
    return start, end


class ProgressOverviewView(APIView):
    """Daily arrays of weight/steps/sleep/water/calories for the overview
    chart - one dense row per calendar day in range (gap-filled with null),
    since the chart needs a stable x-axis across series with different
    natural sampling rates."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        trainee = _resolve_trainee(request)
        start, end = _resolve_range(request)

        metrics_by_date = {
            m.date: m for m in DailyMetric.objects.filter(trainee=trainee, date__range=(start, end))
        }
        consumed_by_date = food_logs_by_day(trainee, start, end)
        burned_by_date = {
            row["date"]: row["total"]
            for row in ActivityLog.objects.filter(trainee=trainee, date__range=(start, end))
            .values("date")
            .annotate(total=Sum("calories_burned"))
        }

        days = []
        cursor = start
        while cursor <= end:
            metric = metrics_by_date.get(cursor)
            consumed = consumed_by_date.get(cursor)
            calories_consumed = consumed["calories"] if consumed else None
            calories_burned = burned_by_date.get(cursor)
            net_calories = None
            if calories_consumed is not None or calories_burned is not None:
                net_calories = (calories_consumed or 0) - (calories_burned or 0)

            days.append(
                {
                    "date": cursor,
                    "weight_kg": to_kg(metric.weight, metric.weight_unit) if metric and metric.weight is not None else None,
                    "steps": metric.steps if metric else None,
                    "sleep_hours": metric.sleep_hours if metric else None,
                    "water_intake_ml": metric.water_intake_ml if metric else None,
                    "calories_consumed": calories_consumed,
                    "calories_burned": calories_burned,
                    "net_calories": net_calories,
                }
            )
            cursor += timedelta(days=1)

        return Response({"trainee": trainee.id, "start": start, "end": end, "days": days})


class ProgressTrainingView(APIView):
    """Which exercise the Training dashboard's strength chart should default
    to (the most-logged one in range) plus the range-scoped list of pickable
    exercises. Deliberately does not return set history/PR events - the
    frontend fetches history from the existing /workouts/logged-sets/?exercise=
    endpoint and computes PRs client-side, matching how PR detection already
    works everywhere else in this app (see CLAUDE.md)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        trainee = _resolve_trainee(request)
        start, end = _resolve_range(request)

        counts = (
            LoggedSet.objects.filter(
                logged_exercise__session__trainee=trainee,
                logged_exercise__session__date__range=(start, end),
                is_warmup=False,
            )
            .values(
                "logged_exercise__plan_exercise__exercise_id",
                "logged_exercise__plan_exercise__exercise__name",
            )
            .annotate(set_count=Count("id"))
            .order_by("-set_count")
        )
        logged_exercises = [
            {
                "exercise_id": row["logged_exercise__plan_exercise__exercise_id"],
                "exercise_name": row["logged_exercise__plan_exercise__exercise__name"],
                "set_count": row["set_count"],
            }
            for row in counts
        ]

        exercise_id = request.query_params.get("exercise_id")
        if exercise_id:
            exercise_id = int(exercise_id)
            match = next((e for e in logged_exercises if e["exercise_id"] == exercise_id), None)
            exercise_name = match["exercise_name"] if match else None
        elif logged_exercises:
            exercise_id = logged_exercises[0]["exercise_id"]
            exercise_name = logged_exercises[0]["exercise_name"]
        else:
            exercise_id = None
            exercise_name = None

        return Response(
            {
                "trainee": trainee.id,
                "start": start,
                "end": end,
                "exercise_id": exercise_id,
                "exercise_name": exercise_name,
                "logged_exercises": logged_exercises,
            }
        )


class ProgressTrainingVolumeView(APIView):
    """Weekly total training volume (sets x reps x weight, converted to a
    canonical kg) and weekly session counts, for the Training dashboard's two
    bar charts. Weeks are bucketed in Python (not TruncWeek) so the Monday-of-
    week definition stays identical to workoutStreak.ts's client-side one."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        trainee = _resolve_trainee(request)
        start, end = _resolve_range(request)

        sets = LoggedSet.objects.filter(
            logged_exercise__session__trainee=trainee,
            logged_exercise__session__date__range=(start, end),
            is_warmup=False,
        ).values("weight", "weight_unit", "reps_done", "logged_exercise__session__date")

        volume_by_week = {}
        for s in sets:
            week = monday_of(s["logged_exercise__session__date"])
            weight_kg = to_kg(s["weight"], s["weight_unit"]) or 0
            volume_by_week[week] = volume_by_week.get(week, 0) + weight_kg * s["reps_done"]

        session_dates = WorkoutSession.objects.filter(trainee=trainee, date__range=(start, end)).values_list(
            "date", flat=True
        )
        sessions_by_week = {}
        for d in session_dates:
            week = monday_of(d)
            sessions_by_week[week] = sessions_by_week.get(week, 0) + 1

        weeks = sorted(set(volume_by_week) | set(sessions_by_week))
        payload = [
            {
                "week_start": week,
                "total_volume_kg": volume_by_week.get(week, 0),
                "session_count": sessions_by_week.get(week, 0),
            }
            for week in weeks
        ]

        return Response({"trainee": trainee.id, "start": start, "end": end, "weeks": payload})


class ProgressNutritionView(APIView):
    """Daily calories/macros consumed vs. the diet plan's target, plus the
    diet-adherence percentage, for the Nutrition dashboard."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        trainee = _resolve_trainee(request)
        start, end = _resolve_range(request)

        diet_plan = trainee.diet_plans.first()
        target = diet_plan.average_daily_nutrients() if diet_plan else None

        consumed_by_date = food_logs_by_day(trainee, start, end)
        days = [
            {"date": day, "consumed": nutrients}
            for day, nutrients in sorted(consumed_by_date.items())
        ]

        return Response(
            {
                "trainee": trainee.id,
                "start": start,
                "end": end,
                "target": target,
                "days": days,
                "adherence_pct": diet_adherence_pct(trainee, start, end),
            }
        )


class ProgressRecoveryView(APIView):
    """Daily sleep quality / readiness (both 1-5) for the Recovery dashboard -
    sleep hours itself already lives in the overview chart."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        trainee = _resolve_trainee(request)
        start, end = _resolve_range(request)

        rows = DailyMetric.objects.filter(trainee=trainee, date__range=(start, end)).exclude(
            sleep_quality__isnull=True, readiness__isnull=True
        )
        days = [
            {"date": m.date, "sleep_quality": m.sleep_quality, "readiness": m.readiness}
            for m in rows.order_by("date")
        ]

        return Response({"trainee": trainee.id, "start": start, "end": end, "days": days})


class ProgressConsistencyView(APIView):
    """Adherence percentages (days with a DailyMetric / a workout session / a
    food log, out of days in range) plus the current consecutive-day streak
    of any logged activity, for the Consistency dashboard."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        trainee = _resolve_trainee(request)
        start, end = _resolve_range(request)
        days_in_range = (end - start).days + 1

        metric_dates = set(
            DailyMetric.objects.filter(trainee=trainee, date__range=(start, end)).values_list("date", flat=True)
        )
        session_dates = set(
            WorkoutSession.objects.filter(trainee=trainee, date__range=(start, end)).values_list("date", flat=True)
        )
        food_log_dates = set(food_logs_by_day(trainee, start, end))

        # Streak is a point-in-time fact, not a range aggregate - bounding it
        # by `start` would silently truncate a real streak just because the
        # selected preset happens to be "Last 7 days". Union built unbounded
        # below rather than reusing the range-scoped sets above.
        streak_end = min(end, date.today())
        streak_start = streak_end - timedelta(days=365)
        active_dates = (
            set(
                DailyMetric.objects.filter(trainee=trainee, date__range=(streak_start, streak_end)).values_list(
                    "date", flat=True
                )
            )
            | set(
                WorkoutSession.objects.filter(trainee=trainee, date__range=(streak_start, streak_end)).values_list(
                    "date", flat=True
                )
            )
            | set(food_logs_by_day(trainee, streak_start, streak_end))
        )
        current_streak_days = 0
        cursor = streak_end
        while cursor in active_dates:
            current_streak_days += 1
            cursor -= timedelta(days=1)

        def pct(count):
            return round(count / days_in_range * 100, 1) if days_in_range > 0 else 0.0

        return Response(
            {
                "trainee": trainee.id,
                "start": start,
                "end": end,
                "days_in_range": days_in_range,
                "daily_metric_pct": pct(len(metric_dates)),
                "workout_session_pct": pct(len(session_dates)),
                "diet_log_pct": pct(len(food_log_dates)),
                "current_streak_days": current_streak_days,
            }
        )
