from rest_framework import serializers

from accounts.plan_versions import plan_status

from .models import (
    Exercise,
    ExerciseEditRequest,
    LoggedExercise,
    LoggedSet,
    MuscleGroup,
    PlanExercise,
    PlanSession,
    WorkoutPlan,
    WorkoutSession,
)
from .plan_versions import workout_plan_for_date


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
            "is_unilateral",
            "image",
            "video_url",
            "alternatives",
        ]


class ExerciseEditRequestSerializer(serializers.ModelSerializer):
    exercise_name = serializers.CharField(source="exercise.name", read_only=True)
    requested_by_username = serializers.CharField(source="requested_by.username", read_only=True)

    class Meta:
        model = ExerciseEditRequest
        fields = [
            "id",
            "exercise",
            "exercise_name",
            "requested_by",
            "requested_by_username",
            "description",
            "status",
            "created_at",
        ]
        read_only_fields = ["requested_by", "created_at"]


class WorkoutPlanSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    class Meta:
        model = WorkoutPlan
        fields = ["id", "trainee", "name", "sessions_per_week", "created_at", "effective_from", "published_at", "status"]
        read_only_fields = ["created_at", "effective_from", "published_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["trainee"].queryset = request.user.trainees.all()

    def get_status(self, obj):
        return plan_status(obj)


class PlanExerciseDetailSerializer(serializers.ModelSerializer):
    exercise_name = serializers.CharField(source="exercise.name", read_only=True)
    superset_with_exercise_name = serializers.SerializerMethodField()

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
            "superset_with",
            "superset_with_exercise_name",
        ]
        read_only_fields = ["superset_with"]

    def get_superset_with_exercise_name(self, obj):
        return obj.superset_with.exercise.name if obj.superset_with_id else None


class PlanSessionDetailSerializer(serializers.ModelSerializer):
    exercises = PlanExerciseDetailSerializer(many=True, read_only=True)

    class Meta:
        model = PlanSession
        fields = ["id", "label", "order", "notes", "exercises"]


class WorkoutPlanDetailSerializer(serializers.ModelSerializer):
    """Read-only, fully nested view of a plan: sessions -> exercises. Used for
    viewing/logging against a plan, not authoring it (mirrors DietPlanDetailSerializer)."""

    sessions = PlanSessionDetailSerializer(many=True, read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = WorkoutPlan
        fields = [
            "id",
            "trainee",
            "name",
            "sessions_per_week",
            "created_at",
            "effective_from",
            "published_at",
            "status",
            "sessions",
        ]

    def get_status(self, obj):
        return plan_status(obj)


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
    exercise_name = serializers.CharField(source="exercise.name", read_only=True)
    superset_with_exercise_name = serializers.SerializerMethodField()

    class Meta:
        model = PlanExercise
        fields = [
            "id",
            "session",
            "exercise",
            "exercise_name",
            "target_sets",
            "target_reps_min",
            "target_reps_max",
            "default_rest_seconds",
            "order",
            "notes",
            "superset_with",
            "superset_with_exercise_name",
        ]
        read_only_fields = ["superset_with"]

    def get_superset_with_exercise_name(self, obj):
        return obj.superset_with.exercise.name if obj.superset_with_id else None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["session"].queryset = PlanSession.objects.filter(plan__trainee__trainer=request.user)
            self.fields["exercise"].queryset = Exercise.objects.all()


class LoggedSetNestedSerializer(serializers.ModelSerializer):
    """Write-side shape of one set, nested under LoggedExerciseNestedSerializer
    inside WorkoutSessionSerializer - see LoggedSetSerializer below for the
    flat, standalone shape used by exercise history.

    weight/reps_done and the _left/_right pairs are all optional here since
    exactly one shape applies depending on the logged exercise's laterality -
    WorkoutSessionSerializer.validate checks the right one was actually sent,
    and _upsert only ever persists that one, discarding the other shape's
    fields even if a stale/wrong one was included."""

    class Meta:
        model = LoggedSet
        fields = [
            "id",
            "set_number",
            "weight",
            "weight_unit",
            "reps_done",
            "weight_left",
            "weight_right",
            "reps_done_left",
            "reps_done_right",
            "rest_seconds",
            "is_warmup",
            "is_dropset",
            "rpe",
            "rpe_left",
            "rpe_right",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            "weight": {"required": False, "allow_null": True},
            "reps_done": {"required": False, "allow_null": True},
        }


class LoggedExerciseNestedSerializer(serializers.ModelSerializer):
    sets = LoggedSetNestedSerializer(many=True)
    exercise_name = serializers.SerializerMethodField()

    class Meta:
        model = LoggedExercise
        fields = ["id", "plan_exercise", "exercise_name", "substituted_exercise", "superset_partner", "order", "sets"]
        read_only_fields = ["id"]

    def get_exercise_name(self, obj):
        # Reflects the off-program substitution when one was logged, so
        # anything reading this field (history browsers, etc.) shows what was
        # actually performed without needing to know about substitution.
        # `planned_exercise` (not plan_exercise.exercise) so this keeps
        # working even if the plan_exercise it was logged against has since
        # been deleted (e.g. the trainer reshaped the plan) - see the model's
        # own comment on why plan_exercise is SET_NULL, not CASCADE.
        if obj.substituted_exercise_id:
            return obj.substituted_exercise.name
        return obj.planned_exercise.name if obj.planned_exercise_id else "Deleted exercise"


class WorkoutSessionSerializer(serializers.ModelSerializer):
    """Nested read/write serializer for a full session log: session ->
    logged_exercises -> sets, all in one request - mirrors LoggedMealSerializer.
    The frontend always POSTs/PUTs the complete current state; create/update
    both upsert on (trainee, plan_session, date), matching WorkoutSession's
    unique_together (re-logging the same session/day replaces it)."""

    logged_exercises = LoggedExerciseNestedSerializer(many=True)
    plan_session_label = serializers.CharField(read_only=True)

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
            "calories_burned",
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
            self.fields["logged_exercises"].child.fields["superset_partner"].queryset = PlanExercise.objects.filter(
                session__plan__trainee=request.user
            )

    def validate(self, attrs):
        logged_exercises = attrs.get("logged_exercises") or []
        if not logged_exercises:
            raise serializers.ValidationError("At least one logged exercise is required.")
        plan_session = attrs.get("plan_session", getattr(self.instance, "plan_session", None))
        # Only the plan version that applies to this day can be logged against
        # (never a draft, nor a version scheduled for later).
        day_plan = workout_plan_for_date(self.context["request"].user, attrs.get("date", getattr(self.instance, "date", None)))
        if day_plan is None or plan_session.plan_id != day_plan.id:
            raise serializers.ValidationError("That session isn't part of your plan for this date.")
        plan_exercise_ids = {le["plan_exercise"].id for le in logged_exercises}
        for logged_exercise in logged_exercises:
            if logged_exercise["plan_exercise"].session_id != plan_session.id:
                raise serializers.ValidationError("Every logged exercise must belong to the session being logged.")
            if not logged_exercise.get("sets"):
                raise serializers.ValidationError("Every logged exercise needs at least one set.")
            partner = logged_exercise.get("superset_partner")
            if partner and partner.id not in plan_exercise_ids:
                raise serializers.ValidationError("A superset partner must also be logged in this same session.")

            effective_exercise = logged_exercise.get("substituted_exercise") or logged_exercise["plan_exercise"].exercise
            for set_data in logged_exercise["sets"]:
                if effective_exercise.is_unilateral:
                    if any(
                        set_data.get(f) is None
                        for f in ("weight_left", "weight_right", "reps_done_left", "reps_done_right")
                    ):
                        raise serializers.ValidationError(
                            "Every set of a per-side exercise needs a weight and reps for both sides."
                        )
                elif set_data.get("weight") is None or set_data.get("reps_done") is None:
                    raise serializers.ValidationError("Every set needs a weight and reps.")
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
                "calories_burned": validated_data.get("calories_burned"),
                # Snapshotted so history/exports still have a label once
                # plan_session itself is gone (SET_NULL, not CASCADE - see
                # the model's own comment) - refreshed on every re-save while
                # it's still live, same as every other field here.
                "plan_session_label": validated_data["plan_session"].label,
            },
        )
        # Only replaces logged_exercises the frontend can actually re-submit
        # (it always POSTs the complete current state - see this class's
        # docstring) - one whose plan_exercise has since been deleted (e.g.
        # the trainer swapped it out, see the model's own comment) can't be
        # represented in that live-plan-driven form at all, so its absence
        # from this request means "wasn't editable," not "trainee removed
        # it." Left untouched rather than wiped.
        session.logged_exercises.filter(plan_exercise__isnull=False).delete()
        for order, logged_exercise_data in enumerate(logged_exercises_data):
            sets_data = logged_exercise_data.pop("sets")
            substituted_exercise = logged_exercise_data.get("substituted_exercise")
            plan_exercise = logged_exercise_data["plan_exercise"]
            effective_exercise = substituted_exercise or plan_exercise.exercise
            logged_exercise = LoggedExercise.objects.create(
                session=session,
                plan_exercise=plan_exercise,
                planned_exercise=plan_exercise.exercise,
                substituted_exercise=substituted_exercise,
                superset_partner=logged_exercise_data.get("superset_partner"),
                order=order,
            )
            for set_data in sets_data:
                # Only ever persists the shape that matches the exercise -
                # discards the other shape's fields even if the client sent
                # them (e.g. a stale left/right pair from before an
                # off-program substitution swapped in a bilateral exercise).
                common = {
                    "set_number": set_data["set_number"],
                    "weight_unit": set_data["weight_unit"],
                    "rest_seconds": set_data.get("rest_seconds"),
                    "is_warmup": set_data.get("is_warmup", False),
                    "is_dropset": set_data.get("is_dropset", False),
                }
                if effective_exercise.is_unilateral:
                    LoggedSet.objects.create(
                        logged_exercise=logged_exercise,
                        **common,
                        weight_left=set_data["weight_left"],
                        weight_right=set_data["weight_right"],
                        reps_done_left=set_data["reps_done_left"],
                        reps_done_right=set_data["reps_done_right"],
                        rpe_left=set_data.get("rpe_left"),
                        rpe_right=set_data.get("rpe_right"),
                    )
                else:
                    LoggedSet.objects.create(
                        logged_exercise=logged_exercise,
                        **common,
                        weight=set_data["weight"],
                        reps_done=set_data["reps_done"],
                        rpe=set_data.get("rpe"),
                    )
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
    exercise = serializers.SerializerMethodField()

    def get_exercise(self, obj):
        # Off-program substitutions attribute history/PR-detection to the
        # exercise actually performed, not the one the plan called for.
        # `planned_exercise_id` (not plan_exercise.exercise_id) so this keeps
        # resolving correctly even after the plan_exercise it was logged
        # against has been deleted - see the model's own comment.
        le = obj.logged_exercise
        return le.substituted_exercise_id or le.planned_exercise_id

    class Meta:
        model = LoggedSet
        fields = [
            "id",
            "logged_exercise",
            "set_number",
            "weight",
            "weight_unit",
            "reps_done",
            "weight_left",
            "weight_right",
            "reps_done_left",
            "reps_done_right",
            "rest_seconds",
            "is_warmup",
            "is_dropset",
            "rpe",
            "rpe_left",
            "rpe_right",
            "session_date",
            "exercise",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["logged_exercise"].queryset = LoggedExercise.objects.filter(session__trainee=request.user)
