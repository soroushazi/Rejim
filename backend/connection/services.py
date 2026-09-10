from .models import PlanChangeLog


def log_plan_change(trainee, changed_by, plan_type, summary):
    """Called from perform_create/update/destroy on the 7 plan-structure
    viewsets in nutrition/workouts - see TRAINER_DASHBOARD_SPEC.md section 4.
    A plain function call rather than a signal, matching this codebase's
    existing convention of explicit service calls over implicit hooks."""
    PlanChangeLog.objects.create(
        trainee=trainee,
        changed_by=changed_by,
        plan_type=plan_type,
        summary=summary,
    )
