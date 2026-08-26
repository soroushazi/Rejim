from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ActivityLogViewSet, DailyMetricViewSet, DashboardView

router = DefaultRouter()
router.register("daily-metrics", DailyMetricViewSet, basename="dailymetric")
router.register("activity-logs", ActivityLogViewSet, basename="activitylog")

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
] + router.urls
