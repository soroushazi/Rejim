from django.urls import path

from .views import (
    ProgressConsistencyView,
    ProgressNutritionView,
    ProgressOverviewView,
    ProgressRecoveryView,
    ProgressTrainingView,
    ProgressTrainingVolumeView,
)

urlpatterns = [
    path("overview/", ProgressOverviewView.as_view(), name="progress-overview"),
    path("training/", ProgressTrainingView.as_view(), name="progress-training"),
    path("training-volume/", ProgressTrainingVolumeView.as_view(), name="progress-training-volume"),
    path("nutrition/", ProgressNutritionView.as_view(), name="progress-nutrition"),
    path("recovery/", ProgressRecoveryView.as_view(), name="progress-recovery"),
    path("consistency/", ProgressConsistencyView.as_view(), name="progress-consistency"),
]
