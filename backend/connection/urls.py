from rest_framework.routers import DefaultRouter

from .views import QAMessageViewSet, QAThreadViewSet, TrainerNoteViewSet

router = DefaultRouter()
router.register("threads", QAThreadViewSet, basename="qathread")
router.register("messages", QAMessageViewSet, basename="qamessage")
router.register("notes", TrainerNoteViewSet, basename="trainernote")

urlpatterns = router.urls
