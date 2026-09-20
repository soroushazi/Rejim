from rest_framework import serializers

from .models import ActivityLog, ActivityMET, DailyMetric


class DailyMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyMetric
        fields = [
            "id",
            "trainee",
            "date",
            "weight",
            "weight_unit",
            "steps",
            "sleep_hours",
            "sleep_quality",
            "readiness",
            "water_intake_ml",
            "notes",
        ]
        read_only_fields = ["trainee"]

    def create(self, validated_data):
        # Upsert on (trainee, date): the frontend's quick-entry form always POSTs
        # the complete current state for the selected date, same convention as
        # LoggedMealSerializer/WorkoutSessionSerializer.
        user = self.context["request"].user
        date = validated_data.pop("date")
        metric, _ = DailyMetric.objects.update_or_create(trainee=user, date=date, defaults=validated_data)
        return metric


class ActivityMETSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityMET
        fields = ["id", "name", "met_value"]


class ActivityLogSerializer(serializers.ModelSerializer):
    activity_met_name = serializers.CharField(source="activity_met.name", read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            "id",
            "trainee",
            "date",
            "activity_met",
            "activity_met_name",
            "duration_minutes",
            "calories_burned",
            "notes",
        ]
        read_only_fields = ["trainee"]
