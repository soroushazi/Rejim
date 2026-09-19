from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    PlanChangeLogViewSet,
    QAMessageViewSet,
    QAThreadViewSet,
    TrainerConnectionView,
    TrainerNoteViewSet,
    TrainerPrivateNoteViewSet,
    UnreadSummaryView,
)

router = DefaultRouter()
router.register("threads", QAThreadViewSet, basename="qathread")
router.register("messages", QAMessageViewSet, basename="qamessage")
router.register("notes", TrainerNoteViewSet, basename="trainernote")
router.register("private-notes", TrainerPrivateNoteViewSet, basename="trainerprivatenote")
router.register("plan-change-log", PlanChangeLogViewSet, basename="planchangelog")

urlpatterns = [
    path("trainer-connection/", TrainerConnectionView.as_view(), name="trainer-connection"),
    path("unread-summary/", UnreadSummaryView.as_view(), name="unread-summary"),
] + router.urls
