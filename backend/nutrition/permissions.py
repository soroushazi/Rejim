from rest_framework.permissions import SAFE_METHODS, BasePermission

from accounts.models import User


class FoodItemWritePermission(BasePermission):
    """Any authenticated user can browse (queryset scoping handles what they see) and
    create FoodItems. Only a trainer or the item's own creator can edit/delete it."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return user.role == User.Role.TRAINER or obj.created_by_id == user.id
