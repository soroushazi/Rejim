from django.db.models import Q
from rest_framework import serializers

from .models import QAMessage, QAThread, TrainerNote


class QAThreadSerializer(serializers.ModelSerializer):
    trainee_username = serializers.CharField(source="trainee.username", read_only=True)

    class Meta:
        model = QAThread
        fields = ["id", "trainee", "trainee_username", "subject", "status", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is None:
            return
        user = request.user
        if user.role == user.Role.TRAINEE:
            # A trainee can only ever open a thread about themselves - server-set.
            self.fields["trainee"].read_only = True
        else:
            # A trainer must name one of their own trainees.
            self.fields["trainee"].queryset = user.trainees.all()


class QAMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    sender_role = serializers.CharField(source="sender.role", read_only=True)

    class Meta:
        model = QAMessage
        fields = ["id", "thread", "sender", "sender_username", "sender_role", "body", "created_at"]
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
    trainee_username = serializers.CharField(source="trainee.username", read_only=True)

    class Meta:
        model = TrainerNote
        fields = ["id", "trainee", "trainee_username", "body", "created_at", "read", "read_at"]
        read_only_fields = ["created_at", "read", "read_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["trainee"].queryset = request.user.trainees.all()
