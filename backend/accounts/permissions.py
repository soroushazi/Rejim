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
