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

    def _should_log_change(self, instance):
        # Overridden by accounts.plan_versions.PlanVersionLockMixin to skip
        # edits to a not-yet-published draft version.
        return True

    def _log(self, instance, verb):
        if self._should_log_change(instance):
            trainee, label = self._change_log_context(instance)
            log_plan_change(trainee, self.request.user, self.plan_type, f"{verb} {label}")

    def perform_create(self, serializer):
        instance = serializer.save()
        self._log(instance, "Added")

    def perform_update(self, serializer):
        instance = serializer.save()
        self._log(instance, "Updated")

    def perform_destroy(self, instance):
        # Resolve the log context before the row (and its parent links) is gone.
        should_log = self._should_log_change(instance)
        trainee, label = self._change_log_context(instance)
        instance.delete()
        if should_log:
            log_plan_change(trainee, self.request.user, self.plan_type, f"Removed {label}")
