from rest_framework import viewsets

from accounts.mixins import TraineeScopedQuerysetMixin
from accounts.permissions import IsTraineeWriteTrainerReadOnly, IsTrainerWriteTraineeReadOnly
from connection.mixins import PlanChangeLoggingMixin

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
from .serializers import (
    ExerciseSerializer,
    LoggedExerciseSerializer,
    LoggedSetSerializer,
    MuscleGroupSerializer,
    PlanExerciseSerializer,
    PlanSessionSerializer,
    WorkoutPlanDetailSerializer,
    WorkoutPlanSerializer,
    WorkoutSessionSerializer,
)


class MuscleGroupViewSet(viewsets.ModelViewSet):
    queryset = MuscleGroup.objects.all()
    serializer_class = MuscleGroupSerializer
    permission_classes = [IsTrainerWriteTraineeReadOnly]


class ExerciseViewSet(viewsets.ModelViewSet):
    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer
    permission_classes = [IsTrainerWriteTraineeReadOnly]


class WorkoutPlanViewSet(PlanChangeLoggingMixin, TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = WorkoutPlan.objects.all()
    serializer_class = WorkoutPlanSerializer
    permission_classes = [IsTrainerWriteTraineeReadOnly]
    trainee_path = "trainee"
    plan_type = "workout"

    def get_serializer_class(self):
        if self.action == "retrieve":
            return WorkoutPlanDetailSerializer
        return WorkoutPlanSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == "retrieve":
            queryset = queryset.prefetch_related("sessions__exercises__exercise")
        trainee_id = self.request.query_params.get("trainee_id")
        if trainee_id:
            queryset = queryset.filter(trainee_id=trainee_id)
        return queryset

    def _change_log_context(self, instance):
        return instance.trainee, f"workout plan '{instance.name}'"


class PlanSessionViewSet(PlanChangeLoggingMixin, TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = PlanSession.objects.all()
    serializer_class = PlanSessionSerializer
    permission_classes = [IsTrainerWriteTraineeReadOnly]
    trainee_path = "plan__trainee"
    plan_type = "workout"

    def _change_log_context(self, instance):
        return instance.plan.trainee, f"session '{instance.label}'"


class PlanExerciseViewSet(PlanChangeLoggingMixin, TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = PlanExercise.objects.all()
    serializer_class = PlanExerciseSerializer
    permission_classes = [IsTrainerWriteTraineeReadOnly]
    trainee_path = "session__plan__trainee"
    plan_type = "workout"

    def _change_log_context(self, instance):
        return instance.session.plan.trainee, f"{instance.exercise.name} in {instance.session.label}"


class WorkoutSessionViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = WorkoutSession.objects.all()
    serializer_class = WorkoutSessionSerializer
    permission_classes = [IsTraineeWriteTrainerReadOnly]
    trainee_path = "trainee"

    def get_queryset(self):
        queryset = super().get_queryset().prefetch_related("logged_exercises__sets", "logged_exercises__plan_exercise__exercise")
        start = self.request.query_params.get("start")
        if start:
            queryset = queryset.filter(date__gte=start)
        end = self.request.query_params.get("end")
        if end:
            queryset = queryset.filter(date__lte=end)
        return queryset


class LoggedExerciseViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = LoggedExercise.objects.all()
    serializer_class = LoggedExerciseSerializer
    permission_classes = [IsTraineeWriteTrainerReadOnly]
    trainee_path = "session__trainee"


class LoggedSetViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = LoggedSet.objects.all()
    serializer_class = LoggedSetSerializer
    permission_classes = [IsTraineeWriteTrainerReadOnly]
    trainee_path = "logged_exercise__session__trainee"

    def get_queryset(self):
        queryset = super().get_queryset()
        start = self.request.query_params.get("start")
        if start:
            queryset = queryset.filter(logged_exercise__session__date__gte=start)
        end = self.request.query_params.get("end")
        if end:
            queryset = queryset.filter(logged_exercise__session__date__lte=end)
        exercise_id = self.request.query_params.get("exercise")
        if exercise_id:
            queryset = queryset.filter(logged_exercise__plan_exercise__exercise_id=exercise_id)
        return queryset
