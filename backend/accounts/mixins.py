from .models import User


class TraineeScopedQuerysetMixin:
    """Scopes a viewset's queryset to what the requesting user is allowed to see:
    a trainer sees their trainees' records, a trainee sees only their own.

    Set `trainee_path` to the lookup path from the model to its trainee FK,
    e.g. "trainee", "session__trainee", "day__plan__trainee".
    """

    trainee_path = "trainee"

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        if user.role == User.Role.TRAINER:
            return queryset.filter(**{f"{self.trainee_path}__trainer": user})
        return queryset.filter(**{self.trainee_path: user})
