from rest_framework import serializers

from .models import ActivityLog, DailyMetric


class DailyMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyMetric
        fields = ["id", "trainee", "date", "weight", "weight_unit", "steps", "sleep_hours"]
        read_only_fields = ["trainee"]


class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = ["id", "trainee", "date", "activity_type", "duration_minutes"]
        read_only_fields = ["trainee"]
