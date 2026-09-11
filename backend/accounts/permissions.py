from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsTrainer(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_trainer)


class IsTrainerWriteTraineeReadOnly(BasePermission):
    """Trainer-authored resources (plans): trainer can write, trainee gets read-only."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_trainer


class IsTraineeWriteTrainerReadOnly(BasePermission):
    """Trainee-logged resources (sessions/food logs): trainee can write their own, trainer gets read-only."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_trainee


class GoalWritePermission(BasePermission):
    """Goal ownership flips once a trainer is assigned (TRAINER_DASHBOARD_SPEC.md):
    a trainee may write their own goals only while unassigned (trainer is None -
    covers the onboarding wizard, used before any TrainerConnection resolves);
    once a trainer is assigned, only that trainer may write, and the trainee's
    own view goes read-only. State-based, not "goals created after assignment" -
    applies retroactively to goals a trainee made before being assigned too.

    Object-level access is decided by whose trainee the goal actually belongs
    to (obj.trainee_id), not by the requester's own capability flags - this is
    what lets a dual-role account (both is_trainer and is_trainee) manage a
    trainee's goal AND their own goal through the same endpoint without one
    capability shadowing the other."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user.is_trainer or request.user.is_trainee)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        if obj.trainee_id == user.id:
            return user.is_trainee and user.trainer_id is None
        return user.is_trainer and obj.trainee.trainer_id == user.id
