from rest_framework import serializers

from workouts.models import Exercise

from .models import Goal, Notification, ReminderSetting, UserPreference


class GoalSerializer(serializers.ModelSerializer):
    current_weight_kg = serializers.SerializerMethodField()

    class Meta:
        model = Goal
        fields = [
            "id",
            "trainee",
            "goal_type",
            "target_weight",
            "target_weight_unit",
            "direction",
            "exercise",
            "target_value",
            "target_value_unit",
            "target_date",
            "is_active",
            "created_at",
            "current_weight_kg",
        ]
        read_only_fields = ["created_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Same IDOR-prevention convention used across the app: restrict a
        # writable FK's queryset to what this requester may actually reference.
        self.fields["exercise"].queryset = Exercise.objects.all()
        request = self.context.get("request")
        if request is None:
            return
        user = request.user
        # Optional and restricted to this requester's own trainees - naturally
        # empty for a pure trainee, so DRF rejects any value they try to pass.
        # Omitting it means "about themselves" (see GoalViewSet.perform_create;
        # whether they're allowed to write at all is GoalWritePermission's job).
        self.fields["trainee"].required = False
        self.fields["trainee"].queryset = user.trainees.all()

    def get_current_weight_kg(self, obj):
        # "Progress measured against real data, not a duplicate field" - see
        # accounts.services.resolve_current_weight_kg, also used by Profile's
        # BMI. None for strength goals.
        if obj.goal_type != Goal.GoalType.WEIGHT:
            return None
        from accounts.services import resolve_current_weight_kg

        return resolve_current_weight_kg(obj.trainee)

    def validate(self, attrs):
        goal_type = attrs.get("goal_type", getattr(self.instance, "goal_type", None))
        if goal_type == Goal.GoalType.WEIGHT:
            for field in ("target_weight", "target_weight_unit", "direction"):
                value = attrs.get(field, getattr(self.instance, field, None))
                if value is None:
                    raise serializers.ValidationError({field: "Required for a weight goal."})
            attrs["exercise"] = None
            attrs["target_value"] = None
            attrs["target_value_unit"] = None
        elif goal_type == Goal.GoalType.STRENGTH:
            for field in ("exercise", "target_value", "target_value_unit"):
                value = attrs.get(field, getattr(self.instance, field, None))
                if value is None:
                    raise serializers.ValidationError({field: "Required for a strength goal."})
            attrs["target_weight"] = None
            attrs["target_weight_unit"] = None
            attrs["direction"] = None
        return attrs


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = ["default_weight_unit"]


class ReminderSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReminderSetting
        fields = [
            "id",
            "reminder_type",
            "is_enabled",
            "time_of_day",
            "channel_in_app",
            "channel_push",
            "channel_banner",
            "channel_email",
        ]

    def create(self, validated_data):
        # Upsert on (user, reminder_type): mirrors DailyMetricSerializer's
        # upsert-on-(trainee, date) convention in tracker/serializers.py.
        user = self.context["request"].user
        reminder_type = validated_data.pop("reminder_type")
        reminder, _ = ReminderSetting.objects.update_or_create(
            user=user, reminder_type=reminder_type, defaults=validated_data
        )
        return reminder


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "kind", "title", "body", "reminder", "goal", "is_read", "read_at", "created_at"]
        read_only_fields = fields
