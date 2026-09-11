from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.mixins import TraineeScopedQuerysetMixin
from accounts.permissions import IsTrainer, IsTrainerWriteTraineeReadOnly

from .models import PlanChangeLog, QAMessage, QAThread, TrainerConnection, TrainerNote, TrainerPrivateNote
from .serializers import (
    PlanChangeLogSerializer,
    QAMessageSerializer,
    QAThreadSerializer,
    TrainerConnectionSerializer,
    TrainerNoteSerializer,
    TrainerPrivateNoteSerializer,
)


class QAThreadViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = QAThread.objects.all()
    serializer_class = QAThreadSerializer
    permission_classes = [IsAuthenticated]
    trainee_path = "trainee"

    def perform_create(self, serializer):
        user = self.request.user
        trainee = serializer.validated_data.get("trainee")
        if trainee is None:
            # No trainee named - about themselves, server-set.
            if not user.is_trainee:
                raise PermissionDenied("trainee is required.")
            serializer.save(trainee=user)
        else:
            # A trainer named one of their own trainees (validated_data
            # already restricted to that queryset by the serializer).
            serializer.save()


class QAMessageViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = QAMessage.objects.all()
    serializer_class = QAMessageSerializer
    permission_classes = [IsAuthenticated]
    trainee_path = "thread__trainee"

    def get_queryset(self):
        queryset = super().get_queryset()
        thread_id = self.request.query_params.get("thread")
        if thread_id is not None:
            queryset = queryset.filter(thread_id=thread_id)
        return queryset

    def perform_create(self, serializer):
        thread = serializer.validated_data["thread"]
        message = serializer.save(sender=self.request.user)
        QAThread.objects.filter(pk=thread.pk).update(updated_at=timezone.now())
        return message


class TrainerNoteViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = TrainerNote.objects.all()
    serializer_class = TrainerNoteSerializer
    permission_classes = [IsTrainerWriteTraineeReadOnly]
    trainee_path = "trainee"

    def get_permissions(self):
        if self.action == "mark_read":
            return [IsAuthenticated()]
        return super().get_permissions()

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        note = self.get_object()
        if request.user != note.trainee:
            raise PermissionDenied("Only the note's trainee can mark it read.")
        note.read = True
        note.read_at = timezone.now()
        note.save(update_fields=["read", "read_at"])
        return Response(self.get_serializer(note).data)


class TrainerConnectionView(APIView):
    """Trainee-only, own row - a first-time trainer-assignment request
    submitted from the onboarding wizard. GET returns 204 (no body) if none
    exists yet - Response(None) with a 200 renders with no body/content-type
    at all, which the frontend's JSON-parsing apiFetch() can't distinguish
    from an error, whereas 204 is already special-cased there. POST upserts
    (a trainee resubmitting before being assigned just replaces their prior
    request)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        connection = TrainerConnection.objects.filter(trainee=request.user).first()
        if connection is None:
            return Response(status=204)
        return Response(TrainerConnectionSerializer(connection).data)

    def post(self, request):
        connection = TrainerConnection.objects.filter(trainee=request.user).first()
        serializer = TrainerConnectionSerializer(connection, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(trainee=request.user)
        return Response(serializer.data, status=201)


class TrainerPrivateNoteViewSet(viewsets.ModelViewSet):
    """Trainer-only both ways - unlike every other resource in this app
    (including TrainerNote above), there is no trainee read path at all here,
    by design (see TRAINER_DASHBOARD_SPEC.md)."""

    serializer_class = TrainerPrivateNoteSerializer
    permission_classes = [IsTrainer]

    def get_queryset(self):
        queryset = TrainerPrivateNote.objects.filter(trainer=self.request.user)
        trainee_id = self.request.query_params.get("trainee_id")
        if trainee_id:
            queryset = queryset.filter(trainee_id=trainee_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(trainer=self.request.user)


class PlanChangeLogViewSet(TraineeScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = PlanChangeLog.objects.all()
    serializer_class = PlanChangeLogSerializer
    permission_classes = [IsTrainer]
    trainee_path = "trainee"

    def get_queryset(self):
        queryset = super().get_queryset()
        plan_type = self.request.query_params.get("plan_type")
        if plan_type:
            queryset = queryset.filter(plan_type=plan_type)
        return queryset
