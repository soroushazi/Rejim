from rest_framework.routers import DefaultRouter

from .views import (
    ExerciseViewSet,
    LoggedExerciseViewSet,
    LoggedSetViewSet,
    MuscleGroupViewSet,
    PlanExerciseViewSet,
    PlanSessionViewSet,
    WorkoutPlanViewSet,
    WorkoutSessionViewSet,
)

router = DefaultRouter()
router.register("muscle-groups", MuscleGroupViewSet, basename="musclegroup")
router.register("exercises", ExerciseViewSet, basename="exercise")
router.register("plans", WorkoutPlanViewSet, basename="workoutplan")
router.register("plan-sessions", PlanSessionViewSet, basename="plansession")
router.register("plan-exercises", PlanExerciseViewSet, basename="planexercise")
router.register("sessions", WorkoutSessionViewSet, basename="workoutsession")
router.register("logged-exercises", LoggedExerciseViewSet, basename="loggedexercise")
router.register("logged-sets", LoggedSetViewSet, basename="loggedset")

urlpatterns = router.urls
