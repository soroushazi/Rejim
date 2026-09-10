from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ChangePasswordView, MeView, TraineeViewSet

router = DefaultRouter()
router.register("trainees", TraineeViewSet, basename="trainee")

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
] + router.urls
