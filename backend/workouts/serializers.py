from rest_framework import serializers

from .models import LoggedExercise, LoggedSet, PlanDay, PlanExercise, WorkoutPlan, WorkoutSession


class WorkoutPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutPlan
        fields = ["id", "trainee", "name", "created_at"]
        read_only_fields = ["created_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["trainee"].queryset = request.user.trainees.all()


class PlanDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanDay
        fields = ["id", "plan", "label", "order"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["plan"].queryset = WorkoutPlan.objects.filter(trainee__trainer=request.user)


class PlanExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanExercise
        fields = ["id", "day", "name", "target_sets", "target_reps", "default_rest_seconds", "order"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["day"].queryset = PlanDay.objects.filter(plan__trainee__trainer=request.user)


class WorkoutSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutSession
        fields = ["id", "trainee", "plan_day", "date"]
        read_only_fields = ["trainee"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["plan_day"].queryset = PlanDay.objects.filter(plan__trainee=request.user)


class LoggedExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoggedExercise
        fields = ["id", "session", "plan_exercise", "order"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["session"].queryset = WorkoutSession.objects.filter(trainee=request.user)
            self.fields["plan_exercise"].queryset = PlanExercise.objects.filter(day__plan__trainee=request.user)


class LoggedSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoggedSet
        fields = ["id", "logged_exercise", "set_number", "weight", "reps_done", "rest_seconds"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["logged_exercise"].queryset = LoggedExercise.objects.filter(session__trainee=request.user)
