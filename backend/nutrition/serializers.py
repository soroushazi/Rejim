from rest_framework import serializers

from .models import DietPlan, FoodItem, FoodLog, ReferenceMeal, ReferenceMealItem


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
        fields = ["id", "diet_plan", "label", "order"]

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
    actual_nutrients = serializers.SerializerMethodField()

    class Meta:
        model = FoodLog
        fields = ["id", "trainee", "reference_meal_item", "actual_weight_grams", "logged_at", "actual_nutrients"]
        read_only_fields = ["trainee"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["reference_meal_item"].queryset = ReferenceMealItem.objects.filter(
                meal__diet_plan__trainee=request.user
            )

    def get_actual_nutrients(self, obj):
        return obj.actual_nutrients()
