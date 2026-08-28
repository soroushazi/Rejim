from rest_framework import serializers

from accounts.models import User

from .models import (
    DietPlan,
    FoodItem,
    FoodItemComponent,
    FoodLog,
    LoggedMeal,
    MealOption,
    QuickLogItem,
    ReferenceMeal,
    ReferenceMealItem,
)

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


class MealOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealOption
        fields = ["id", "meal", "label", "order"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["meal"].queryset = ReferenceMeal.objects.filter(diet_plan__trainee__trainer=request.user)


class ReferenceMealItemSerializer(serializers.ModelSerializer):
    reference_nutrients = serializers.SerializerMethodField()

    class Meta:
        model = ReferenceMealItem
        fields = ["id", "option", "food_item", "reference_weight_grams", "reference_nutrients"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["option"].queryset = MealOption.objects.filter(
                meal__diet_plan__trainee__trainer=request.user
            )
            self.fields["food_item"].queryset = FoodItem.visible_to(request.user)

    def get_reference_nutrients(self, obj):
        return obj.reference_nutrients()


class ReferenceMealItemDetailSerializer(serializers.ModelSerializer):
    food_item_name = serializers.CharField(source="food_item.name", read_only=True)
    reference_nutrients = serializers.SerializerMethodField()

    class Meta:
        model = ReferenceMealItem
        fields = ["id", "food_item", "food_item_name", "reference_weight_grams", "reference_nutrients"]

    def get_reference_nutrients(self, obj):
        return obj.reference_nutrients()


class MealOptionDetailSerializer(serializers.ModelSerializer):
    items = ReferenceMealItemDetailSerializer(many=True, read_only=True)
    nutrients = serializers.SerializerMethodField()

    class Meta:
        model = MealOption
        fields = ["id", "label", "order", "items", "nutrients"]

    def get_nutrients(self, obj):
        return obj.reference_nutrients()


class ReferenceMealDetailSerializer(serializers.ModelSerializer):
    options = MealOptionDetailSerializer(many=True, read_only=True)
    average_nutrients = serializers.SerializerMethodField()

    class Meta:
        model = ReferenceMeal
        fields = ["id", "label", "day_of_week", "order", "options", "average_nutrients"]

    def get_average_nutrients(self, obj):
        return obj.average_nutrients()


class DietPlanDetailSerializer(serializers.ModelSerializer):
    """Read-only, fully nested view of a plan: meals -> options -> items, with
    computed nutrients at every level. Used for viewing a plan, not authoring it."""

    meals = ReferenceMealDetailSerializer(many=True, read_only=True)
    average_daily_nutrients = serializers.SerializerMethodField()

    class Meta:
        model = DietPlan
        fields = ["id", "trainee", "name", "created_at", "meals", "average_daily_nutrients"]

    def get_average_daily_nutrients(self, obj):
        return obj.average_daily_nutrients()


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
                option__meal__diet_plan__trainee=request.user
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


class LoggedMealItemSerializer(serializers.ModelSerializer):
    """One ingredient row within a LoggedMeal - backed by FoodLog (same row type
    used for ad hoc logging), scoped here via FoodLog.logged_meal."""

    food_item_name = serializers.SerializerMethodField()
    actual_nutrients = serializers.SerializerMethodField()

    class Meta:
        model = FoodLog
        fields = ["id", "reference_meal_item", "food_item", "food_item_name", "actual_weight_grams", "actual_nutrients"]
        extra_kwargs = {"reference_meal_item": {"required": False}, "food_item": {"required": False}}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["reference_meal_item"].queryset = ReferenceMealItem.objects.filter(
                option__meal__diet_plan__trainee=request.user
            )
            self.fields["food_item"].queryset = FoodItem.visible_to(request.user)

    def get_food_item_name(self, obj):
        if obj.food_item_id:
            return obj.food_item.name
        if obj.reference_meal_item_id:
            return obj.reference_meal_item.food_item.name
        return ""

    def get_actual_nutrients(self, obj):
        return obj.actual_nutrients()


class LoggedMealSerializer(serializers.ModelSerializer):
    items = LoggedMealItemSerializer(many=True)
    reference_meal_label = serializers.CharField(source="reference_meal.label", read_only=True)
    meal_option_label = serializers.SerializerMethodField()
    total_nutrients = serializers.SerializerMethodField()

    class Meta:
        model = LoggedMeal
        fields = [
            "id",
            "trainee",
            "reference_meal",
            "reference_meal_label",
            "date",
            "source",
            "meal_option_label",
            "items",
            "total_nutrients",
        ]
        read_only_fields = ["trainee"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["reference_meal"].queryset = ReferenceMeal.objects.filter(diet_plan__trainee=request.user)

    def get_meal_option_label(self, obj):
        if obj.source != LoggedMeal.Source.PLAN:
            return None
        first_item = obj.items.select_related("reference_meal_item__option").first()
        return first_item.reference_meal_item.option.label if first_item else None

    def get_total_nutrients(self, obj):
        return obj.total_nutrients()

    def validate(self, attrs):
        items = attrs.get("items") or []
        if not items:
            raise serializers.ValidationError("At least one item is required.")

        source = attrs.get("source", getattr(self.instance, "source", None))
        reference_meal = attrs.get("reference_meal", getattr(self.instance, "reference_meal", None))

        if source == LoggedMeal.Source.PLAN:
            if any(item.get("food_item") for item in items):
                raise serializers.ValidationError("Plan-sourced items must reference a plan item, not a food item.")
            if any(not item.get("reference_meal_item") for item in items):
                raise serializers.ValidationError("Every plan-sourced item needs a reference_meal_item.")
            if any(item["reference_meal_item"].option.meal_id != reference_meal.id for item in items):
                raise serializers.ValidationError("Every item must belong to the meal being logged.")
        else:
            if any(item.get("reference_meal_item") for item in items):
                raise serializers.ValidationError("Custom items must not reference a plan item.")
            if any(not item.get("food_item") for item in items):
                raise serializers.ValidationError("Every custom item needs a food_item.")
        return attrs

    def create(self, validated_data):
        return self._upsert(validated_data)

    def update(self, instance, validated_data):
        return self._upsert(validated_data)

    def _upsert(self, validated_data):
        items_data = validated_data.pop("items")
        user = self.context["request"].user
        logged_meal, _ = LoggedMeal.objects.update_or_create(
            trainee=user,
            reference_meal=validated_data["reference_meal"],
            date=validated_data["date"],
            defaults={"source": validated_data["source"]},
        )
        logged_meal.items.all().delete()
        for item in items_data:
            FoodLog.objects.create(
                trainee=user,
                logged_meal=logged_meal,
                source=FoodLog.Source.PLAN if item.get("reference_meal_item") else FoodLog.Source.FOOD_ITEM,
                reference_meal_item=item.get("reference_meal_item"),
                food_item=item.get("food_item"),
                actual_weight_grams=item["actual_weight_grams"],
            )
        return logged_meal
