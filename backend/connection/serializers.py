from django.db.models import Q
from rest_framework import serializers

from .models import PlanChangeLog, QAMessage, QAThread, TrainerConnection, TrainerNote, TrainerPrivateNote


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
        # Optional and restricted to this requester's own trainees - naturally
        # empty for a pure trainee, so DRF rejects any value they try to pass.
        # Omitting it means "about themselves" (see QAThreadViewSet.perform_create).
        self.fields["trainee"].required = False
        self.fields["trainee"].queryset = user.trainees.all()


class QAMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    sender_role = serializers.SerializerMethodField()

    class Meta:
        model = QAMessage
        fields = ["id", "thread", "sender", "sender_username", "sender_role", "body", "created_at"]
        read_only_fields = ["sender", "created_at"]

    def get_sender_role(self, obj):
        return "trainer" if obj.sender.is_trainer else "trainee"

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


class TrainerConnectionSerializer(serializers.ModelSerializer):
    assigned_trainer_username = serializers.CharField(source="assigned_trainer.username", read_only=True, default=None)

    class Meta:
        model = TrainerConnection
        fields = [
            "id",
            "option_selected",
            "requested_trainer_name",
            "status",
            "assigned_trainer",
            "assigned_trainer_username",
            "created_at",
        ]
        read_only_fields = ["status", "assigned_trainer", "created_at"]

    def validate(self, attrs):
        option = attrs.get("option_selected", getattr(self.instance, "option_selected", None))
        if option == TrainerConnection.Option.SPECIFIC_TRAINER:
            name = attrs.get("requested_trainer_name", getattr(self.instance, "requested_trainer_name", ""))
            if not name:
                raise serializers.ValidationError(
                    {"requested_trainer_name": "Required when requesting a specific trainer."}
                )
        else:
            attrs["requested_trainer_name"] = ""
        if option == TrainerConnection.Option.TRAIN_MYSELF:
            # Not built yet - the UI disables this option, this is belt-and-suspenders.
            raise serializers.ValidationError({"option_selected": "Train myself isn't available yet."})
        return attrs


class TrainerPrivateNoteSerializer(serializers.ModelSerializer):
    trainee_username = serializers.CharField(source="trainee.username", read_only=True)

    class Meta:
        model = TrainerPrivateNote
        fields = ["id", "trainee", "trainee_username", "content", "created_at"]
        read_only_fields = ["created_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["trainee"].queryset = request.user.trainees.all()


class PlanChangeLogSerializer(serializers.ModelSerializer):
    changed_by_username = serializers.CharField(source="changed_by.username", read_only=True, default=None)

    class Meta:
        model = PlanChangeLog
        fields = ["id", "trainee", "changed_by", "changed_by_username", "plan_type", "summary", "created_at"]
        read_only_fields = fields
