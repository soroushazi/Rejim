from rest_framework.routers import DefaultRouter

from .views import DietPlanViewSet, FoodItemViewSet, FoodLogViewSet, ReferenceMealItemViewSet, ReferenceMealViewSet

router = DefaultRouter()
router.register("food-items", FoodItemViewSet, basename="fooditem")
router.register("diet-plans", DietPlanViewSet, basename="dietplan")
router.register("reference-meals", ReferenceMealViewSet, basename="referencemeal")
router.register("reference-meal-items", ReferenceMealItemViewSet, basename="referencemealitem")
router.register("logs", FoodLogViewSet, basename="foodlog")

urlpatterns = router.urls
