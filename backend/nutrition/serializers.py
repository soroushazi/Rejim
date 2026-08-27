from rest_framework import serializers

from accounts.models import User

from .models import DietPlan, FoodItem, FoodItemComponent, FoodLog, QuickLogItem, ReferenceMeal, ReferenceMealItem

MACRO_FIELDS = ["calories_per_100g", "protein_g_per_100g", "carbs_g_per_100g", "fat_g_per_100g"]


class FoodItemComponentSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)

    class Meta:
        model = FoodItemComponent
        fields = ["id", "ingredient", "ingredient_name", "weight_grams"]


class FoodItemSerializer(serializers.ModelSerializer):
    components = FoodItemComponentSerializer(many=True, required=False)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True, default=None)

    class Meta:
        model = FoodItem
        fields = [
            "id",
            "name",
            "barcode",
            "source",
            "kind",
            "serving_unit",
            "serving_size_grams",
            "calories_per_100g",
            "protein_g_per_100g",
            "carbs_g_per_100g",
            "fat_g_per_100g",
            "fiber_g_per_100g",
            "sugar_g_per_100g",
            "sodium_mg_per_100g",
            "potassium_mg_per_100g",
            "calcium_mg_per_100g",
            "iron_mg_per_100g",
            "vitamin_c_mg_per_100g",
            "vitamin_a_mcg_per_100g",
            "visibility",
            "approval_status",
            "created_by",
            "created_by_username",
            "components",
        ]
        read_only_fields = ["source", "approval_status", "created_by"]
        extra_kwargs = {field: {"required": False} for field in MACRO_FIELDS}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["components"].child.fields["ingredient"].queryset = FoodItem.visible_to(request.user)

    def validate(self, attrs):
        kind = attrs.get("kind", getattr(self.instance, "kind", FoodItem.Kind.SINGLE))
        components = attrs.get("components")
        if kind == FoodItem.Kind.SINGLE:
            missing = [f for f in MACRO_FIELDS if attrs.get(f) is None and getattr(self.instance, f, None) is None]
            if missing:
                raise serializers.ValidationError(
                    "calories, protein, carbs, and fat are required for a single item."
                )
        elif kind == FoodItem.Kind.COMPOSITE and components is not None and not components:
            raise serializers.ValidationError("A multi-ingredient item needs at least one component.")

        serving_unit = attrs.get("serving_unit", getattr(self.instance, "serving_unit", FoodItem.ServingUnit.GRAM))
        serving_size_grams = attrs.get("serving_size_grams", getattr(self.instance, "serving_size_grams", None))
        if serving_unit != FoodItem.ServingUnit.GRAM and serving_size_grams is None:
            raise serializers.ValidationError("serving_size_grams is required for a non-gram measurement unit.")
        return attrs

    def _visibility_and_approval(self, user, visibility):
        if user.role == User.Role.TRAINER:
            return FoodItem.Visibility.PUBLIC, FoodItem.ApprovalStatus.APPROVED
        visibility = visibility or FoodItem.Visibility.PRIVATE
        approval = (
            FoodItem.ApprovalStatus.APPROVED
            if visibility == FoodItem.Visibility.PRIVATE
            else FoodItem.ApprovalStatus.PENDING
        )
        return visibility, approval

    def create(self, validated_data):
        components_data = validated_data.pop("components", [])
        user = self.context["request"].user
        validated_data["visibility"], validated_data["approval_status"] = self._visibility_and_approval(
            user, validated_data.get("visibility")
        )
        validated_data["created_by"] = user
        if validated_data.get("kind") == FoodItem.Kind.COMPOSITE:
            for field in MACRO_FIELDS:
                validated_data.setdefault(field, 0)

        food_item = FoodItem.objects.create(**validated_data)
        for component in components_data:
            FoodItemComponent.objects.create(composite=food_item, **component)
        if food_item.kind == FoodItem.Kind.COMPOSITE:
            food_item.recompute_from_components()
        return food_item

    def update(self, instance, validated_data):
        components_data = validated_data.pop("components", None)
        user = self.context["request"].user
        if "visibility" in validated_data:
            validated_data["visibility"], validated_data["approval_status"] = self._visibility_and_approval(
                user, validated_data["visibility"]
            )
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if components_data is not None:
            instance.components.all().delete()
            for component in components_data:
                FoodItemComponent.objects.create(composite=instance, **component)
        if instance.kind == FoodItem.Kind.COMPOSITE:
            instance.recompute_from_components()
        return instance


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
            self.fields["food_item"].queryset = FoodItem.visible_to(request.user)

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
            "potassium_mg",
            "calcium_mg",
            "iron_mg",
            "vitamin_c_mg",
            "vitamin_a_mcg",
        ]
        read_only_fields = [
            "trainee",
            "calories",
            "protein_g",
            "carbs_g",
            "fat_g",
            "fiber_g",
            "sugar_g",
            "sodium_mg",
            "potassium_mg",
            "calcium_mg",
            "iron_mg",
            "vitamin_c_mg",
            "vitamin_a_mcg",
        ]
        extra_kwargs = {"source": {"required": True}}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["reference_meal_item"].queryset = ReferenceMealItem.objects.filter(
                meal__diet_plan__trainee=request.user
            )
            self.fields["food_item"].queryset = FoodItem.visible_to(request.user)
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
