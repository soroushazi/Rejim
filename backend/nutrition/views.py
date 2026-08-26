from rest_framework import viewsets

from accounts.mixins import TraineeScopedQuerysetMixin
from accounts.permissions import IsTraineeWriteTrainerReadOnly, IsTrainerWriteTraineeReadOnly

from .models import DietPlan, FoodItem, FoodLog, ReferenceMeal, ReferenceMealItem
from .serializers import (
    DietPlanSerializer,
    FoodItemSerializer,
    FoodLogSerializer,
    ReferenceMealItemSerializer,
    ReferenceMealSerializer,
)


class FoodItemViewSet(viewsets.ModelViewSet):
    queryset = FoodItem.objects.all()
    serializer_class = FoodItemSerializer
    permission_classes = [IsTrainerWriteTraineeReadOnly]


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
