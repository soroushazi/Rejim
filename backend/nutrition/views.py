from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.mixins import TraineeScopedQuerysetMixin
from accounts.permissions import IsTrainer, IsTraineeWriteTrainerReadOnly, IsTrainerWriteTraineeReadOnly

from .models import (
    DietaryTag,
    DietPlan,
    FoodItem,
    FoodLog,
    LoggedMeal,
    MacroFilter,
    MealOption,
    QuickLogItem,
    ReferenceMeal,
    ReferenceMealItem,
)
from .permissions import FoodItemWritePermission
from .serializers import (
    DietaryTagSerializer,
    DietPlanDetailSerializer,
    DietPlanSerializer,
    FoodItemSerializer,
    FoodLogSerializer,
    LoggedMealSerializer,
    MacroFilterSerializer,
    MealOptionSerializer,
    QuickLogItemSerializer,
    ReferenceMealItemSerializer,
    ReferenceMealSerializer,
)


class MacroFilterViewSet(viewsets.ModelViewSet):
    queryset = MacroFilter.objects.all()
    serializer_class = MacroFilterSerializer
    permission_classes = [IsTrainerWriteTraineeReadOnly]


class DietaryTagViewSet(viewsets.ModelViewSet):
    queryset = DietaryTag.objects.all()
    serializer_class = DietaryTagSerializer
    permission_classes = [IsTrainerWriteTraineeReadOnly]


class FoodItemViewSet(viewsets.ModelViewSet):
    serializer_class = FoodItemSerializer
    permission_classes = [FoodItemWritePermission]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    def get_queryset(self):
        queryset = FoodItem.visible_to(self.request.user).order_by("name")
        macro_filter_ids = self.request.query_params.getlist("macro_filter")
        if macro_filter_ids:
            queryset = queryset.filter(macro_filters__id__in=macro_filter_ids)
        dietary_tag_ids = self.request.query_params.getlist("dietary_tag")
        if dietary_tag_ids:
            queryset = queryset.filter(dietary_tags__id__in=dietary_tag_ids)
        if macro_filter_ids or dietary_tag_ids:
            queryset = queryset.distinct()
        return queryset

    @action(detail=True, methods=["post"], permission_classes=[IsTrainer])
    def review(self, request, pk=None):
        food_item = self.get_object()
        approval_status = request.data.get("approval_status")
        if approval_status not in (FoodItem.ApprovalStatus.APPROVED, FoodItem.ApprovalStatus.REJECTED):
            return Response({"detail": "approval_status must be 'approved' or 'rejected'."}, status=400)
        food_item.approval_status = approval_status
        food_item.save(update_fields=["approval_status"])
        return Response(self.get_serializer(food_item).data)

    @action(detail=True, methods=["get"])
    def alternatives(self, request, pk=None):
        """Other FoodItems that could substitute for this one: same macro role
        (sharing at least one macro_filter, e.g. "Lean Protein"), ranked by how
        close their calories per 100g are to this item's - the simplest useful
        notion of "nutritionally comparable" without a bespoke similarity table."""
        food_item = self.get_object()
        macro_filter_ids = list(food_item.macro_filters.values_list("id", flat=True))
        if not macro_filter_ids:
            return Response([])
        candidates = (
            FoodItem.visible_to(request.user)
            .filter(macro_filters__id__in=macro_filter_ids)
            .exclude(id=food_item.id)
            .distinct()
        )
        candidates = sorted(candidates, key=lambda c: abs(c.calories_per_100g - food_item.calories_per_100g))[:10]
        return Response(self.get_serializer(candidates, many=True).data)


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
        start = self.request.query_params.get("start")
        if start:
            queryset = queryset.filter(date__gte=start)
        end = self.request.query_params.get("end")
        if end:
            queryset = queryset.filter(date__lte=end)
        return queryset
