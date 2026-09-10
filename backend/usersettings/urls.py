from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    GoalViewSet,
    NotificationBannerView,
    NotificationViewSet,
    PushSubscriptionView,
    ReminderSettingViewSet,
    UserPreferenceView,
    VapidPublicKeyView,
)

router = DefaultRouter()
router.register("goals", GoalViewSet, basename="goal")
router.register("reminders", ReminderSettingViewSet, basename="remindersetting")
router.register("notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    path("preferences/", UserPreferenceView.as_view(), name="preferences"),
    path("notifications/banner/", NotificationBannerView.as_view(), name="notification-banner"),
    path("notifications/push-subscription/", PushSubscriptionView.as_view(), name="push-subscription"),
    path("notifications/vapid-public-key/", VapidPublicKeyView.as_view(), name="vapid-public-key"),
] + router.urls
