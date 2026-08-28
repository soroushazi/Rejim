from rest_framework.routers import DefaultRouter

from .views import (
    DietPlanViewSet,
    FoodItemViewSet,
    FoodLogViewSet,
    LoggedMealViewSet,
    MealOptionViewSet,
    QuickLogItemViewSet,
    ReferenceMealItemViewSet,
    ReferenceMealViewSet,
)

router = DefaultRouter()
router.register("food-items", FoodItemViewSet, basename="fooditem")
router.register("quick-log-items", QuickLogItemViewSet, basename="quicklogitem")
router.register("diet-plans", DietPlanViewSet, basename="dietplan")
router.register("reference-meals", ReferenceMealViewSet, basename="referencemeal")
router.register("meal-options", MealOptionViewSet, basename="mealoption")
router.register("reference-meal-items", ReferenceMealItemViewSet, basename="referencemealitem")
router.register("logs", FoodLogViewSet, basename="foodlog")
router.register("logged-meals", LoggedMealViewSet, basename="loggedmeal")

urlpatterns = router.urls
