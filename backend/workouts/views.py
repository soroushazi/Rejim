from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.mixins import TraineeScopedQuerysetMixin
from accounts.permissions import EditRequestPermission, IsTraineeWriteTrainerReadOnly, IsTrainerWriteTraineeReadOnly
from connection.mixins import PlanChangeLoggingMixin
from connection.services import log_plan_change

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
from .serializers import (
    ExerciseEditRequestSerializer,
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


class ExerciseEditRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ExerciseEditRequestSerializer
    permission_classes = [EditRequestPermission]

    def get_queryset(self):
        user = self.request.user
        queryset = ExerciseEditRequest.objects.select_related("exercise", "requested_by")
        if not user.is_trainer:
            queryset = queryset.filter(requested_by=user)
        exercise_id = self.request.query_params.get("exercise")
        if exercise_id:
            queryset = queryset.filter(exercise_id=exercise_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user)


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

    def get_queryset(self):
        # pair/unpair are detail (by-id) actions like retrieve/update/destroy -
        # the pk already pins the object, so they should match either capacity
        # (own record, or a trainee's as their trainer) rather than picking
        # just one via the list/create trainee_id branch (see
        # TraineeScopedQuerysetMixin's docstring).
        if self.action in ("pair", "unpair"):
            user = self.request.user
            condition = Q(**{self.trainee_path: user})
            if user.is_trainer:
                condition |= Q(**{f"{self.trainee_path}__trainer": user})
            return self.queryset.filter(condition)
        return super().get_queryset()

    def _change_log_context(self, instance):
        return instance.session.plan.trainee, f"{instance.exercise.name} in {instance.session.label}"

    @action(detail=True, methods=["post"])
    def pair(self, request, pk=None):
        """Links this exercise and `partner` (must be in the same session) as a
        superset - always mirrored on both sides. Pairs only: pairing either
        one with a third exercise first unpairs its previous partner."""
        plan_exercise = self.get_object()
        partner = get_object_or_404(self.get_queryset(), pk=request.data.get("partner"), session_id=plan_exercise.session_id)
        if partner.id == plan_exercise.id:
            return Response({"detail": "Cannot pair an exercise with itself."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            for stale_id in {plan_exercise.superset_with_id, partner.superset_with_id}:
                if stale_id and stale_id not in (plan_exercise.id, partner.id):
                    PlanExercise.objects.filter(pk=stale_id).update(superset_with=None)
            plan_exercise.superset_with = partner
            partner.superset_with = plan_exercise
            plan_exercise.save(update_fields=["superset_with"])
            partner.save(update_fields=["superset_with"])
        trainee, _ = self._change_log_context(plan_exercise)
        log_plan_change(
            trainee, request.user, self.plan_type, f"Paired {plan_exercise.exercise.name} + {partner.exercise.name} as a superset"
        )
        return Response(self.get_serializer(plan_exercise).data)

    @action(detail=True, methods=["post"])
    def unpair(self, request, pk=None):
        plan_exercise = self.get_object()
        if plan_exercise.superset_with_id:
            with transaction.atomic():
                partner = plan_exercise.superset_with
                PlanExercise.objects.filter(pk__in=[plan_exercise.id, partner.id]).update(superset_with=None)
            trainee, _ = self._change_log_context(plan_exercise)
            log_plan_change(trainee, request.user, self.plan_type, f"Unpaired {plan_exercise.exercise.name} superset")
            plan_exercise.refresh_from_db()
        return Response(self.get_serializer(plan_exercise).data)


class WorkoutSessionViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = WorkoutSession.objects.all()
    serializer_class = WorkoutSessionSerializer
    permission_classes = [IsTraineeWriteTrainerReadOnly]
    trainee_path = "trainee"

    def get_queryset(self):
        queryset = super().get_queryset().prefetch_related(
            "logged_exercises__sets", "logged_exercises__plan_exercise__exercise", "logged_exercises__substituted_exercise"
        )
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
            # An off-program substitution moves a set's "true" exercise away
            # from its plan_exercise default - match sets substituted *to*
            # this exercise, or un-substituted sets whose plan default *is*
            # this exercise (mirrors LoggedSetSerializer.get_exercise).
            queryset = queryset.filter(
                Q(logged_exercise__substituted_exercise_id=exercise_id)
                | (Q(logged_exercise__substituted_exercise__isnull=True) & Q(logged_exercise__plan_exercise__exercise_id=exercise_id))
            )
        return queryset
