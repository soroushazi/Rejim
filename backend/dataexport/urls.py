from django.urls import path

from .views import DailyMetricsExportView, DietLogExportView, WorkoutLogExportView

urlpatterns = [
    path("diet-log/", DietLogExportView.as_view(), name="export-diet-log"),
    path("workout-log/", WorkoutLogExportView.as_view(), name="export-workout-log"),
    path("daily-metrics/", DailyMetricsExportView.as_view(), name="export-daily-metrics"),
]
