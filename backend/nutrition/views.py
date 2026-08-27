from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.mixins import TraineeScopedQuerysetMixin
from accounts.permissions import IsTrainer, IsTraineeWriteTrainerReadOnly, IsTrainerWriteTraineeReadOnly

from .models import DietPlan, FoodItem, FoodLog, QuickLogItem, ReferenceMeal, ReferenceMealItem
from .permissions import FoodItemWritePermission
from .serializers import (
    DietPlanSerializer,
    FoodItemSerializer,
    FoodLogSerializer,
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


class ReferenceMealViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = ReferenceMeal.objects.all()
    serializer_class = ReferenceMealSerializer
    permission_classes = [IsTrainerWriteTraineeReadOnly]
    trainee_path = "diet_plan__trainee"


class ReferenceMealItemViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = ReferenceMealItem.objects.all()
    serializer_class = ReferenceMealItemSerializer
    permission_classes = [IsTrainerWriteTraineeReadOnly]
    trainee_path = "meal__diet_plan__trainee"


class FoodLogViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = FoodLog.objects.all()
    serializer_class = FoodLogSerializer
    permission_classes = [IsTraineeWriteTrainerReadOnly]
    trainee_path = "trainee"

    def perform_create(self, serializer):
        serializer.save(trainee=self.request.user)
