from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.mixins import TraineeScopedQuerysetMixin
from accounts.permissions import IsTrainerWriteTraineeReadOnly

from .models import QAMessage, QAThread, TrainerNote
from .serializers import QAMessageSerializer, QAThreadSerializer, TrainerNoteSerializer


class QAThreadViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = QAThread.objects.all()
    serializer_class = QAThreadSerializer
    permission_classes = [IsAuthenticated]
    trainee_path = "trainee"

    def perform_create(self, serializer):
        if self.request.user.role != self.request.user.Role.TRAINEE:
            raise PermissionDenied("Only a trainee can open a new Q&A thread.")
        serializer.save(trainee=self.request.user)


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
