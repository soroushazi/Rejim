from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.mixins import TraineeScopedQuerysetMixin
from accounts.permissions import IsTrainer, IsTraineeWriteTrainerReadOnly, IsTrainerWriteTraineeReadOnly

from .models import DietPlan, FoodItem, FoodLog, LoggedMeal, MealOption, QuickLogItem, ReferenceMeal, ReferenceMealItem
from .permissions import FoodItemWritePermission
from .serializers import (
    DietPlanDetailSerializer,
    DietPlanSerializer,
    FoodItemSerializer,
    FoodLogSerializer,
    LoggedMealSerializer,
    MealOptionSerializer,
    QuickLogItemSerializer,
    ReferenceMealItemSerializer,
    ReferenceMealSerializer,
)


class FoodItemViewSet(viewsets.ModelViewSet):
    serializer_class = FoodItemSerializer
    permission_classes = [FoodItemWritePermission]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    def get_queryset(self):
        return FoodItem.visible_to(self.request.user).order_by("name")

    @action(detail=True, methods=["post"], permission_classes=[IsTrainer])
    def review(self, request, pk=None):
        food_item = self.get_object()
        approval_status = request.data.get("approval_status")
        if approval_status not in (FoodItem.ApprovalStatus.APPROVED, FoodItem.ApprovalStatus.REJECTED):
            return Response({"detail": "approval_status must be 'approved' or 'rejected'."}, status=400)
        food_item.approval_status = approval_status
        food_item.save(update_fields=["approval_status"])
        return Response(self.get_serializer(food_item).data)


class QuickLogItemViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = QuickLogItem.objects.all()
    serializer_class = QuickLogItemSerializer
    permission_classes = [IsTraineeWriteTrainerReadOnly]
    trainee_path = "trainee"

    def perform_create(self, serializer):
        serializer.save(trainee=self.request.user)


class DietPlanViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = DietPlan.objects.all()
    serializer_class = DietPlanSerializer
    permission_classes = [IsTrainerWriteTraineeReadOnly]
    trainee_path = "trainee"

    def get_serializer_class(self):
        if self.action == "retrieve":
            return DietPlanDetailSerializer
        return DietPlanSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == "retrieve":
            queryset = queryset.prefetch_related("meals__options__items__food_item")
        return queryset


class ReferenceMealViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = ReferenceMeal.objects.all()
    serializer_class = ReferenceMealSerializer
    permission_classes = [IsTrainerWriteTraineeReadOnly]
    trainee_path = "diet_plan__trainee"


class MealOptionViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = MealOption.objects.all()
    serializer_class = MealOptionSerializer
    permission_classes = [IsTrainerWriteTraineeReadOnly]
    trainee_path = "meal__diet_plan__trainee"


class ReferenceMealItemViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = ReferenceMealItem.objects.all()
    serializer_class = ReferenceMealItemSerializer
    permission_classes = [IsTrainerWriteTraineeReadOnly]
    trainee_path = "option__meal__diet_plan__trainee"


class FoodLogViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = FoodLog.objects.all()
    serializer_class = FoodLogSerializer
    permission_classes = [IsTraineeWriteTrainerReadOnly]
    trainee_path = "trainee"

    def perform_create(self, serializer):
        serializer.save(trainee=self.request.user)


class LoggedMealViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = LoggedMeal.objects.all()
    serializer_class = LoggedMealSerializer
    permission_classes = [IsTraineeWriteTrainerReadOnly]
    trainee_path = "trainee"

    def get_queryset(self):
        queryset = super().get_queryset().prefetch_related(
            "items__food_item", "items__reference_meal_item__food_item", "items__reference_meal_item__option"
        )
        date = self.request.query_params.get("date")
        if date:
            queryset = queryset.filter(date=date)
        return queryset
