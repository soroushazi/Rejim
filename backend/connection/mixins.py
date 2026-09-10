from .services import log_plan_change


class PlanChangeLoggingMixin:
    """Logs a PlanChangeLog row ("Added/Updated/Removed <label>") on every
    create/update/destroy - mixed into the 7 plan-structure viewsets across
    nutrition/workouts. Set `plan_type` ("diet"/"workout") and implement
    `_change_log_context(instance)` -> (trainee, label); the verb prefix is
    applied uniformly here so each viewset only has to resolve who/what."""

    plan_type = None

    def _change_log_context(self, instance):
        raise NotImplementedError

    def perform_create(self, serializer):
        instance = serializer.save()
        trainee, label = self._change_log_context(instance)
        log_plan_change(trainee, self.request.user, self.plan_type, f"Added {label}")

    def perform_update(self, serializer):
        instance = serializer.save()
        trainee, label = self._change_log_context(instance)
        log_plan_change(trainee, self.request.user, self.plan_type, f"Updated {label}")

    def perform_destroy(self, instance):
        trainee, label = self._change_log_context(instance)
        instance.delete()
        log_plan_change(trainee, self.request.user, self.plan_type, f"Removed {label}")
