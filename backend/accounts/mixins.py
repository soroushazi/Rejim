class TraineeScopedQuerysetMixin:
    """Scopes a viewset's queryset to what the requesting user is allowed to see:
    a trainer sees their trainees' records, a trainee sees only their own.

    Set `trainee_path` to the lookup path from the model to its trainee FK,
    e.g. "trainee", "session__trainee", "day__plan__trainee".

    The branch is decided by whether an explicit `?trainee_id=` is present,
    not by the requester's capability flags alone - this is what lets a
    dual-role account (both is_trainer and is_trainee) use the same endpoint
    both ways: the ordinary trainee-tab pages never send `trainee_id` (they
    only ever mean "my own records"), while every trainer-dashboard page
    always names one explicitly. Single-role accounts get byte-identical
    behavior to before, since exactly one flag was ever true for them.
    """

    trainee_path = "trainee"

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        trainee_id = self.request.query_params.get("trainee_id")
        if trainee_id:
            # Requires the target to actually be *this* user's own trainee -
            # a non-trainer (or a trainer probing an unrelated account) can
            # never match here, so this can't be used to read anyone else's
            # data.
            return queryset.filter(**{f"{self.trainee_path}__trainer": user}).filter(
                **{self.trainee_path: trainee_id}
            )
        if user.is_trainer and not user.is_trainee:
            return queryset.filter(**{f"{self.trainee_path}__trainer": user})
        return queryset.filter(**{self.trainee_path: user})
