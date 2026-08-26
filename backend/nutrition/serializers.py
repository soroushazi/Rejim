from rest_framework import serializers

from .models import DietPlan, FoodItem, FoodLog, QuickLogItem, ReferenceMeal, ReferenceMealItem


class FoodItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodItem
        fields = [
            "id",
            "name",
            "barcode",
            "source",
            "calories_per_100g",
            "protein_g_per_100g",
            "carbs_g_per_100g",
            "fat_g_per_100g",
            "fiber_g_per_100g",
            "sugar_g_per_100g",
            "sodium_mg_per_100g",
        ]


class QuickLogItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuickLogItem
        fields = [
            "id",
            "trainee",
            "name",
            "calories",
            "protein_g",
            "carbs_g",
            "fat_g",
            "fiber_g",
            "sugar_g",
            "sodium_mg",
            "created_at",
        ]
        read_only_fields = ["trainee", "created_at"]


class DietPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = DietPlan
        fields = ["id", "trainee", "name", "created_at"]
        read_only_fields = ["created_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["trainee"].queryset = request.user.trainees.all()


class ReferenceMealSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferenceMeal
        fields = ["id", "diet_plan", "label", "day_of_week", "order"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["diet_plan"].queryset = DietPlan.objects.filter(trainee__trainer=request.user)


class ReferenceMealItemSerializer(serializers.ModelSerializer):
    reference_nutrients = serializers.SerializerMethodField()

    class Meta:
        model = ReferenceMealItem
        fields = ["id", "meal", "food_item", "reference_weight_grams", "reference_nutrients"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["meal"].queryset = ReferenceMeal.objects.filter(diet_plan__trainee__trainer=request.user)

    def get_reference_nutrients(self, obj):
        return obj.reference_nutrients()


class FoodLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodLog
        fields = [
            "id",
            "trainee",
            "source",
            "reference_meal_item",
            "food_item",
            "quick_log_item",
            "actual_weight_grams",
            "logged_at",
            "calories",
            "protein_g",
            "carbs_g",
            "fat_g",
            "fiber_g",
            "sugar_g",
            "sodium_mg",
        ]
        read_only_fields = ["trainee", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "sodium_mg"]
        extra_kwargs = {"source": {"required": True}}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["reference_meal_item"].queryset = ReferenceMealItem.objects.filter(
                meal__diet_plan__trainee=request.user
            )
            self.fields["food_item"].queryset = FoodItem.objects.all()
            self.fields["quick_log_item"].queryset = QuickLogItem.objects.filter(trainee=request.user)

    def validate(self, attrs):
        source = attrs.get("source")
        linked = [attrs.get("reference_meal_item"), attrs.get("food_item"), attrs.get("quick_log_item")]
        if sum(bool(x) for x in linked) != 1:
            raise serializers.ValidationError(
                "Exactly one of reference_meal_item, food_item, or quick_log_item must be set."
            )
        if source != FoodLog.Source.QUICK and attrs.get("actual_weight_grams") is None:
            raise serializers.ValidationError("actual_weight_grams is required unless source is 'quick'.")
        return attrs
