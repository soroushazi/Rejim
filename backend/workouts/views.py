from rest_framework import viewsets

from accounts.mixins import TraineeScopedQuerysetMixin
from accounts.permissions import IsTraineeWriteTrainerReadOnly, IsTrainerWriteTraineeReadOnly

from .models import Exercise, LoggedExercise, LoggedSet, MuscleGroup, PlanDay, PlanExercise, WorkoutPlan, WorkoutSession
from .serializers import (
    ExerciseSerializer,
    LoggedExerciseSerializer,
    LoggedSetSerializer,
    MuscleGroupSerializer,
    PlanDaySerializer,
    PlanExerciseSerializer,
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


class WorkoutPlanViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = WorkoutPlan.objects.all()
    serializer_class = WorkoutPlanSerializer
    permission_classes = [IsTrainerWriteTraineeReadOnly]
    trainee_path = "trainee"


class PlanDayViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = PlanDay.objects.all()
    serializer_class = PlanDaySerializer
    permission_classes = [IsTrainerWriteTraineeReadOnly]
    trainee_path = "plan__trainee"


class PlanExerciseViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = PlanExercise.objects.all()
    serializer_class = PlanExerciseSerializer
    permission_classes = [IsTrainerWriteTraineeReadOnly]
    trainee_path = "day__plan__trainee"


class WorkoutSessionViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = WorkoutSession.objects.all()
    serializer_class = WorkoutSessionSerializer
    permission_classes = [IsTraineeWriteTrainerReadOnly]
    trainee_path = "trainee"

    def perform_create(self, serializer):
        serializer.save(trainee=self.request.user)


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
