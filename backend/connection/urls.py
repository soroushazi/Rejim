from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import QAMessageViewSet, QAThreadViewSet, TrainerConnectionView, TrainerNoteViewSet

router = DefaultRouter()
router.register("threads", QAThreadViewSet, basename="qathread")
router.register("messages", QAMessageViewSet, basename="qamessage")
router.register("notes", TrainerNoteViewSet, basename="trainernote")

urlpatterns = [
    path("trainer-connection/", TrainerConnectionView.as_view(), name="trainer-connection"),
] + router.urls
