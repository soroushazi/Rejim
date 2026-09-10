from django.urls import path

from .views import TraineeListView

urlpatterns = [
    path("trainees/", TraineeListView.as_view(), name="trainer-trainees"),
]
