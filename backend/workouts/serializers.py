from rest_framework import serializers

from .models import (
    Exercise,
    LoggedExercise,
    LoggedSet,
    MuscleGroup,
    PlanExercise,
    PlanSession,
    WorkoutPlan,
    WorkoutSession,
)


class MuscleGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = MuscleGroup
        fields = ["id", "name"]


class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = [
            "id",
            "name",
            "description",
            "equipment",
            "primary_muscle_groups",
            "secondary_muscle_groups",
            "difficulty_level",
            "image",
            "video_url",
            "alternatives",
        ]


class WorkoutPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutPlan
        fields = ["id", "trainee", "name", "sessions_per_week", "created_at"]
        read_only_fields = ["created_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["trainee"].queryset = request.user.trainees.all()


class PlanExerciseDetailSerializer(serializers.ModelSerializer):
    exercise_name = serializers.CharField(source="exercise.name", read_only=True)

    class Meta:
        model = PlanExercise
        fields = [
            "id",
            "exercise",
            "exercise_name",
            "target_sets",
            "target_reps_min",
            "target_reps_max",
            "default_rest_seconds",
            "order",
            "notes",
        ]


class PlanSessionDetailSerializer(serializers.ModelSerializer):
    exercises = PlanExerciseDetailSerializer(many=True, read_only=True)

    class Meta:
        model = PlanSession
        fields = ["id", "label", "order", "notes", "exercises"]


class WorkoutPlanDetailSerializer(serializers.ModelSerializer):
    """Read-only, fully nested view of a plan: sessions -> exercises. Used for
    viewing/logging against a plan, not authoring it (mirrors DietPlanDetailSerializer)."""

    sessions = PlanSessionDetailSerializer(many=True, read_only=True)

    class Meta:
        model = WorkoutPlan
        fields = ["id", "trainee", "name", "sessions_per_week", "created_at", "sessions"]


class PlanSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanSession
        fields = ["id", "plan", "label", "order", "notes"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["plan"].queryset = WorkoutPlan.objects.filter(trainee__trainer=request.user)


class PlanExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanExercise
        fields = [
            "id",
            "session",
            "exercise",
            "target_sets",
            "target_reps_min",
            "target_reps_max",
            "default_rest_seconds",
            "order",
            "notes",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["session"].queryset = PlanSession.objects.filter(plan__trainee__trainer=request.user)
            self.fields["exercise"].queryset = Exercise.objects.all()


class LoggedSetNestedSerializer(serializers.ModelSerializer):
    """Write-side shape of one set, nested under LoggedExerciseNestedSerializer
    inside WorkoutSessionSerializer - see LoggedSetSerializer below for the
    flat, standalone shape used by exercise history."""

    class Meta:
        model = LoggedSet
        fields = ["id", "set_number", "weight", "weight_unit", "reps_done", "rest_seconds", "is_warmup", "rpe"]
        read_only_fields = ["id"]


class LoggedExerciseNestedSerializer(serializers.ModelSerializer):
    sets = LoggedSetNestedSerializer(many=True)
    exercise_name = serializers.CharField(source="plan_exercise.exercise.name", read_only=True)

    class Meta:
        model = LoggedExercise
        fields = ["id", "plan_exercise", "exercise_name", "order", "sets"]
        read_only_fields = ["id"]


class WorkoutSessionSerializer(serializers.ModelSerializer):
    """Nested read/write serializer for a full session log: session ->
    logged_exercises -> sets, all in one request - mirrors LoggedMealSerializer.
    The frontend always POSTs/PUTs the complete current state; create/update
    both upsert on (trainee, plan_session, date), matching WorkoutSession's
    unique_together (re-logging the same session/day replaces it)."""

    logged_exercises = LoggedExerciseNestedSerializer(many=True)
    plan_session_label = serializers.CharField(source="plan_session.label", read_only=True)

    class Meta:
        model = WorkoutSession
        fields = [
            "id",
            "trainee",
            "plan_session",
            "plan_session_label",
            "date",
            "notes",
            "duration_minutes",
            "logged_exercises",
        ]
        read_only_fields = ["trainee"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["plan_session"].queryset = PlanSession.objects.filter(plan__trainee=request.user)
            self.fields["logged_exercises"].child.fields["plan_exercise"].queryset = PlanExercise.objects.filter(
                session__plan__trainee=request.user
            )

    def validate(self, attrs):
        logged_exercises = attrs.get("logged_exercises") or []
        if not logged_exercises:
            raise serializers.ValidationError("At least one logged exercise is required.")
        plan_session = attrs.get("plan_session", getattr(self.instance, "plan_session", None))
        for logged_exercise in logged_exercises:
            if logged_exercise["plan_exercise"].session_id != plan_session.id:
                raise serializers.ValidationError("Every logged exercise must belong to the session being logged.")
            if not logged_exercise.get("sets"):
                raise serializers.ValidationError("Every logged exercise needs at least one set.")
        return attrs

    def create(self, validated_data):
        return self._upsert(validated_data)

    def update(self, instance, validated_data):
        return self._upsert(validated_data)

    def _upsert(self, validated_data):
        logged_exercises_data = validated_data.pop("logged_exercises")
        user = self.context["request"].user
        session, _ = WorkoutSession.objects.update_or_create(
            trainee=user,
            plan_session=validated_data["plan_session"],
            date=validated_data["date"],
            defaults={
                "notes": validated_data.get("notes", ""),
                "duration_minutes": validated_data.get("duration_minutes"),
            },
        )
        session.logged_exercises.all().delete()
        for order, logged_exercise_data in enumerate(logged_exercises_data):
            sets_data = logged_exercise_data.pop("sets")
            logged_exercise = LoggedExercise.objects.create(
                session=session, plan_exercise=logged_exercise_data["plan_exercise"], order=order
            )
            for set_data in sets_data:
                LoggedSet.objects.create(logged_exercise=logged_exercise, **set_data)
        return session


class LoggedExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoggedExercise
        fields = ["id", "session", "plan_exercise", "order"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["session"].queryset = WorkoutSession.objects.filter(trainee=request.user)
            self.fields["plan_exercise"].queryset = PlanExercise.objects.filter(session__plan__trainee=request.user)


class LoggedSetSerializer(serializers.ModelSerializer):
    """Flat, standalone shape - used by LoggedSetViewSet, primarily for the
    exercise-history query (GET ?exercise=<id>): session_date/exercise let the
    frontend build both the history list and chart from one flat fetch."""

    session_date = serializers.DateField(source="logged_exercise.session.date", read_only=True)
    exercise = serializers.IntegerField(source="logged_exercise.plan_exercise.exercise_id", read_only=True)

    class Meta:
        model = LoggedSet
        fields = [
            "id",
            "logged_exercise",
            "set_number",
            "weight",
            "weight_unit",
            "reps_done",
            "rest_seconds",
            "is_warmup",
            "rpe",
            "session_date",
            "exercise",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["logged_exercise"].queryset = LoggedExercise.objects.filter(session__trainee=request.user)
