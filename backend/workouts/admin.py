from django.contrib import admin

from .models import LoggedExercise, LoggedSet, PlanDay, PlanExercise, WorkoutPlan, WorkoutSession


class PlanDayInline(admin.TabularInline):
    model = PlanDay
    extra = 1


class PlanExerciseInline(admin.TabularInline):
    model = PlanExercise
    extra = 1


class LoggedExerciseInline(admin.TabularInline):
    model = LoggedExercise
    extra = 0


class LoggedSetInline(admin.TabularInline):
    model = LoggedSet
    extra = 0


@admin.register(WorkoutPlan)
class WorkoutPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "trainee", "created_at")
    inlines = [PlanDayInline]


@admin.register(PlanDay)
class PlanDayAdmin(admin.ModelAdmin):
    list_display = ("plan", "label", "order")
    inlines = [PlanExerciseInline]


@admin.register(WorkoutSession)
class WorkoutSessionAdmin(admin.ModelAdmin):
    list_display = ("trainee", "plan_day", "date")
    inlines = [LoggedExerciseInline]


@admin.register(LoggedExercise)
class LoggedExerciseAdmin(admin.ModelAdmin):
    list_display = ("session", "plan_exercise", "order")
    inlines = [LoggedSetInline]


admin.site.register(PlanExercise)
admin.site.register(LoggedSet)
