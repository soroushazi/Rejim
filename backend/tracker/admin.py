from django.contrib import admin

from .models import ActivityLog, ActivityMET, DailyMetric


@admin.register(DailyMetric)
class DailyMetricAdmin(admin.ModelAdmin):
    list_display = ("trainee", "date", "weight", "steps", "sleep_hours", "sleep_quality", "readiness")
    list_filter = ("trainee",)


@admin.register(ActivityMET)
class ActivityMETAdmin(admin.ModelAdmin):
    list_display = ("name", "met_value")
    search_fields = ("name",)


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("trainee", "date", "activity_met", "duration_minutes", "calories_burned")
    list_filter = ("trainee", "activity_met")
