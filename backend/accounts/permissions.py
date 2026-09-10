from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import User


class IsTrainer(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Role.TRAINER)


class IsTrainerWriteTraineeReadOnly(BasePermission):
    """Trainer-authored resources (plans): trainer can write, trainee gets read-only."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role == User.Role.TRAINER


class IsTraineeWriteTrainerReadOnly(BasePermission):
    """Trainee-logged resources (sessions/food logs): trainee can write their own, trainer gets read-only."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role == User.Role.TRAINEE


class GoalWritePermission(BasePermission):
    """Goal ownership flips once a trainer is assigned (TRAINER_DASHBOARD_SPEC.md):
    a trainee may write their own goals only while unassigned (trainer is None -
    covers the onboarding wizard, used before any TrainerConnection resolves);
    once a trainer is assigned, only that trainer may write, and the trainee's
    own view goes read-only. State-based, not "goals created after assignment" -
    applies retroactively to goals a trainee made before being assigned too."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        if request.user.role == User.Role.TRAINER:
            return True  # narrowed to their own trainees at the object level
        return request.user.trainer_id is None

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if request.user.role == User.Role.TRAINER:
            return obj.trainee.trainer_id == request.user.id
        return obj.trainee_id == request.user.id and request.user.trainer_id is None
