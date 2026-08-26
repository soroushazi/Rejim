from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import MeView, TraineeViewSet

router = DefaultRouter()
router.register("trainees", TraineeViewSet, basename="trainee")

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
] + router.urls
