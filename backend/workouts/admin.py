from django.contrib import admin

from .models import Exercise, LoggedExercise, LoggedSet, MuscleGroup, PlanExercise, PlanSession, WorkoutPlan, WorkoutSession


class PlanSessionInline(admin.TabularInline):
    model = PlanSession
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


@admin.register(MuscleGroup)
class MuscleGroupAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ("name", "difficulty_level", "equipment")
    list_filter = ("difficulty_level", "primary_muscle_groups")
    search_fields = ("name",)
    filter_horizontal = ("primary_muscle_groups", "secondary_muscle_groups", "alternatives")


@admin.register(WorkoutPlan)
class WorkoutPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "trainee", "sessions_per_week", "created_at")
    inlines = [PlanSessionInline]


@admin.register(PlanSession)
class PlanSessionAdmin(admin.ModelAdmin):
    list_display = ("plan", "label", "order")
    inlines = [PlanExerciseInline]


@admin.register(WorkoutSession)
class WorkoutSessionAdmin(admin.ModelAdmin):
    list_display = ("trainee", "plan_session", "date", "duration_minutes")
    inlines = [LoggedExerciseInline]


@admin.register(LoggedExercise)
class LoggedExerciseAdmin(admin.ModelAdmin):
    list_display = ("session", "plan_exercise", "order")
    inlines = [LoggedSetInline]


admin.site.register(PlanExercise)
admin.site.register(LoggedSet)
