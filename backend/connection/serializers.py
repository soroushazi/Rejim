from django.db.models import Q
from rest_framework import serializers

from .models import QAMessage, QAThread, TrainerNote


class QAThreadSerializer(serializers.ModelSerializer):
    class Meta:
        model = QAThread
        fields = ["id", "trainee", "subject", "status", "created_at", "updated_at"]
        read_only_fields = ["trainee", "created_at", "updated_at"]


class QAMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = QAMessage
        fields = ["id", "thread", "sender", "body", "created_at"]
        read_only_fields = ["sender", "created_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            user = request.user
            self.fields["thread"].queryset = QAThread.objects.filter(
                Q(trainee=user) | Q(trainee__trainer=user)
            )


class TrainerNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainerNote
        fields = ["id", "trainee", "body", "created_at", "read", "read_at"]
        read_only_fields = ["created_at", "read", "read_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["trainee"].queryset = request.user.trainees.all()
