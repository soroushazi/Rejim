from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    PlanChangeLogViewSet,
    QAMessageViewSet,
    QAThreadViewSet,
    TrainerConnectionView,
    TrainerNoteViewSet,
    TrainerPrivateNoteViewSet,
)

router = DefaultRouter()
router.register("threads", QAThreadViewSet, basename="qathread")
router.register("messages", QAMessageViewSet, basename="qamessage")
router.register("notes", TrainerNoteViewSet, basename="trainernote")
router.register("private-notes", TrainerPrivateNoteViewSet, basename="trainerprivatenote")
router.register("plan-change-log", PlanChangeLogViewSet, basename="planchangelog")

urlpatterns = [
    path("trainer-connection/", TrainerConnectionView.as_view(), name="trainer-connection"),
] + router.urls
