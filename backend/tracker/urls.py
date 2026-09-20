from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ActivityLogViewSet, ActivityMETViewSet, DailyMetricViewSet, DailySummaryView, DashboardView

router = DefaultRouter()
router.register("daily-metrics", DailyMetricViewSet, basename="dailymetric")
router.register("activity-logs", ActivityLogViewSet, basename="activitylog")
router.register("activity-mets", ActivityMETViewSet, basename="activitymet")

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("daily-summary/", DailySummaryView.as_view(), name="daily-summary"),
] + router.urls
