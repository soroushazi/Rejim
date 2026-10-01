from rest_framework import serializers

from accounts.plan_versions import plan_status

from .models import (
    DietaryTag,
    DietPlan,
    FoodItem,
    FoodItemComponent,
    FoodItemEditRequest,
    FoodItemMeasure,
    FoodLog,
    LoggedMeal,
    MacroFilter,
    MealOption,
    QuickLogItem,
    ReferenceMeal,
    ReferenceMealItem,
)
from .plan_versions import diet_plan_for_date

MACRO_FIELDS = ["calories_per_100g", "protein_g_per_100g", "carbs_g_per_100g", "fat_g_per_100g"]


class MacroFilterSerializer(serializers.ModelSerializer):
    class Meta:
        model = MacroFilter
        fields = ["id", "name"]


class DietaryTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = DietaryTag
        fields = ["id", "name", "description"]


class FoodItemComponentSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)

    class Meta:
        model = FoodItemComponent
        fields = ["id", "ingredient", "ingredient_name", "weight_grams"]


class FoodItemMeasureSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodItemMeasure
        fields = ["id", "label", "grams_per_unit", "is_default"]


class FoodItemSerializer(serializers.ModelSerializer):
    components = FoodItemComponentSerializer(many=True, required=False)
    measures = FoodItemMeasureSerializer(many=True, required=False)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True, default=None)

    class Meta:
        model = FoodItem
        fields = [
            "id",
            "name",
            "brand_name",
            "barcode",
            "source",
            "kind",
            "measures",
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
            "macro_filters",
            "dietary_tags",
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

        measures = attrs.get("measures")
        if measures and sum(1 for m in measures if m.get("is_default")) > 1:
            raise serializers.ValidationError("Only one measure can be the default.")
        return attrs

    def _visibility_and_approval(self, user, visibility):
        if user.is_trainer:
            # A trainer has no use for a Private item (nobody but them could ever see
            # it), so their choice is Public vs. Trainees-only - both trusted enough to
            # skip the approval workflow that a trainee's own public submission needs.
            if visibility not in (FoodItem.Visibility.PUBLIC, FoodItem.Visibility.TRAINEES):
                visibility = FoodItem.Visibility.PUBLIC
            return visibility, FoodItem.ApprovalStatus.APPROVED
        if visibility not in (FoodItem.Visibility.PRIVATE, FoodItem.Visibility.PUBLIC):
            visibility = FoodItem.Visibility.PRIVATE
        approval = (
            FoodItem.ApprovalStatus.APPROVED
            if visibility == FoodItem.Visibility.PRIVATE
            else FoodItem.ApprovalStatus.PENDING
        )
        return visibility, approval

    def create(self, validated_data):
        components_data = validated_data.pop("components", [])
        measures_data = validated_data.pop("measures", [])
        macro_filters = validated_data.pop("macro_filters", None)
        dietary_tags = validated_data.pop("dietary_tags", None)
        user = self.context["request"].user
        validated_data["visibility"], validated_data["approval_status"] = self._visibility_and_approval(
            user, validated_data.get("visibility")
        )
        validated_data["created_by"] = user
        if validated_data.get("kind") == FoodItem.Kind.COMPOSITE:
            for field in MACRO_FIELDS:
                validated_data.setdefault(field, 0)

        food_item = FoodItem.objects.create(**validated_data)
        if macro_filters is not None:
            food_item.macro_filters.set(macro_filters)
        if dietary_tags is not None:
            food_item.dietary_tags.set(dietary_tags)
        for component in components_data:
            FoodItemComponent.objects.create(composite=food_item, **component)
        for measure in measures_data:
            FoodItemMeasure.objects.create(food_item=food_item, **measure)
        if food_item.kind == FoodItem.Kind.COMPOSITE:
            food_item.recompute_from_components()
        return food_item

    def update(self, instance, validated_data):
        components_data = validated_data.pop("components", None)
        measures_data = validated_data.pop("measures", None)
        macro_filters = validated_data.pop("macro_filters", None)
        dietary_tags = validated_data.pop("dietary_tags", None)
        user = self.context["request"].user
        if "visibility" in validated_data:
            validated_data["visibility"], validated_data["approval_status"] = self._visibility_and_approval(
                user, validated_data["visibility"]
            )
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if macro_filters is not None:
            instance.macro_filters.set(macro_filters)
        if dietary_tags is not None:
            instance.dietary_tags.set(dietary_tags)
        if components_data is not None:
            instance.components.all().delete()
            for component in components_data:
                FoodItemComponent.objects.create(composite=instance, **component)
        if measures_data is not None:
            instance.measures.all().delete()
            for measure in measures_data:
                FoodItemMeasure.objects.create(food_item=instance, **measure)
        if instance.kind == FoodItem.Kind.COMPOSITE:
            instance.recompute_from_components()
        return instance


class FoodItemEditRequestSerializer(serializers.ModelSerializer):
    food_item_name = serializers.CharField(source="food_item.name", read_only=True)
    requested_by_username = serializers.CharField(source="requested_by.username", read_only=True)

    class Meta:
        model = FoodItemEditRequest
        fields = [
            "id",
            "food_item",
            "food_item_name",
            "requested_by",
            "requested_by_username",
            "description",
            "status",
            "created_at",
        ]
        read_only_fields = ["requested_by", "created_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["food_item"].queryset = FoodItem.visible_to(request.user)


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
            "potassium_mg",
            "calcium_mg",
            "iron_mg",
            "vitamin_c_mg",
            "vitamin_a_mcg",
            "created_at",
        ]
        read_only_fields = ["trainee", "created_at"]


class DietPlanSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    class Meta:
        model = DietPlan
        fields = ["id", "trainee", "name", "created_at", "effective_from", "published_at", "status"]
        read_only_fields = ["created_at", "effective_from", "published_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["trainee"].queryset = request.user.trainees.all()

    def get_status(self, obj):
        return plan_status(obj)


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
    # So a trainee logging this item can switch units (e.g. "1 whole" instead of
    # grams) even though the trainer authored the plan in grams - see LogMealSlot.
    food_item_measures = FoodItemMeasureSerializer(source="food_item.measures", many=True, read_only=True)
    reference_nutrients = serializers.SerializerMethodField()

    class Meta:
        model = ReferenceMealItem
        fields = [
            "id",
            "food_item",
            "food_item_name",
            "food_item_measures",
            "reference_weight_grams",
            "reference_nutrients",
        ]

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

    status = serializers.SerializerMethodField()

    class Meta:
        model = DietPlan
        fields = [
            "id",
            "trainee",
            "name",
            "created_at",
            "effective_from",
            "published_at",
            "status",
            "meals",
            "average_daily_nutrients",
        ]

    def get_average_daily_nutrients(self, obj):
        return obj.average_daily_nutrients()

    def get_status(self, obj):
        return plan_status(obj)


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
            "custom_name",
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
        # calories/macros/micros are read-only for every source *except*
        # custom, where the trainee's typed-in values are all there is - but
        # DRF's read_only_fields is all-or-nothing per field, so that's
        # enforced in validate() instead; whatever gets submitted for a non-
        # custom source is silently overwritten anyway by FoodLog.save()'s
        # own _compute_nutrients(), so accepting the input here is harmless.
        read_only_fields = ["trainee"]
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
        if source == FoodLog.Source.CUSTOM:
            if any(linked):
                raise serializers.ValidationError(
                    "A custom log can't also reference a reference_meal_item, food_item, or quick_log_item."
                )
            if not attrs.get("custom_name"):
                raise serializers.ValidationError("custom_name is required when source is 'custom'.")
            if any(attrs.get(f) is None for f in ("calories", "protein_g", "carbs_g", "fat_g")):
                raise serializers.ValidationError(
                    "calories, protein_g, carbs_g, and fat_g are all required when source is 'custom' "
                    "(only the micros stay optional)."
                )
        elif sum(bool(x) for x in linked) != 1:
            raise serializers.ValidationError(
                "Exactly one of reference_meal_item, food_item, or quick_log_item must be set."
            )
        if source not in (FoodLog.Source.QUICK, FoodLog.Source.CUSTOM) and attrs.get("actual_weight_grams") is None:
            raise serializers.ValidationError("actual_weight_grams is required unless source is 'quick' or 'custom'.")
        return attrs


class LoggedMealItemSerializer(serializers.ModelSerializer):
    """One ingredient row within a LoggedMeal - backed by FoodLog (same row type
    used for ad hoc logging), scoped here via FoodLog.logged_meal. A LoggedMeal's
    items may freely mix all three sources (e.g. eggs from the plan, an apple
    swapped in from the Food Bank) - see LoggedMealSerializer._upsert, which
    derives the parent meal's overall `source` from this mix rather than
    requiring the client to pre-classify it."""

    food_item_name = serializers.SerializerMethodField()
    actual_nutrients = serializers.SerializerMethodField()

    class Meta:
        model = FoodLog
        fields = [
            "id",
            "reference_meal_item",
            "food_item",
            "quick_log_item",
            "custom_name",
            "food_item_name",
            "actual_weight_grams",
            "actual_nutrients",
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
        extra_kwargs = {
            "reference_meal_item": {"required": False},
            "food_item": {"required": False},
            "quick_log_item": {"required": False},
            "custom_name": {"required": False},
            # Only meaningful for a custom item (see validate()) - write-only
            # since actual_nutrients (above) already carries the same values
            # back out, snapshotted, for every item kind.
            "calories": {"required": False, "write_only": True},
            "protein_g": {"required": False, "write_only": True},
            "carbs_g": {"required": False, "write_only": True},
            "fat_g": {"required": False, "write_only": True},
            "fiber_g": {"required": False, "write_only": True},
            "sugar_g": {"required": False, "write_only": True},
            "sodium_mg": {"required": False, "write_only": True},
            "potassium_mg": {"required": False, "write_only": True},
            "calcium_mg": {"required": False, "write_only": True},
            "iron_mg": {"required": False, "write_only": True},
            "vitamin_c_mg": {"required": False, "write_only": True},
            "vitamin_a_mcg": {"required": False, "write_only": True},
        }

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
        linked = [attrs.get("reference_meal_item"), attrs.get("food_item"), attrs.get("quick_log_item")]
        is_custom = bool(attrs.get("custom_name"))
        if is_custom:
            if any(linked):
                raise serializers.ValidationError(
                    "A custom item can't also reference a plan, food-bank, or quick-log item."
                )
            if any(attrs.get(f) is None for f in ("calories", "protein_g", "carbs_g", "fat_g")):
                raise serializers.ValidationError(
                    "calories, protein_g, carbs_g, and fat_g are all required for a custom item "
                    "(only the micros stay optional)."
                )
        elif sum(bool(x) for x in linked) != 1:
            raise serializers.ValidationError(
                "Exactly one of reference_meal_item, food_item, or quick_log_item must be set."
            )
        if not is_custom and attrs.get("quick_log_item") is None and attrs.get("actual_weight_grams") is None:
            raise serializers.ValidationError("actual_weight_grams is required unless logging a quick-log item.")
        return attrs

    def get_food_item_name(self, obj):
        if obj.custom_name:
            return obj.custom_name
        if obj.food_item_id:
            return obj.food_item.name
        if obj.reference_meal_item_id:
            return obj.reference_meal_item.food_item.name
        if obj.quick_log_item_id:
            return obj.quick_log_item.name
        return obj.planned_food_name

    def get_actual_nutrients(self, obj):
        return obj.actual_nutrients()


class LoggedMealSerializer(serializers.ModelSerializer):
    items = LoggedMealItemSerializer(many=True)
    # Declared explicitly: the model FK is nullable only so a trainer deleting
    # the meal orphans (not destroys) this log - a new log must always name one.
    # (Queryset narrowed per-request in __init__.)
    reference_meal = serializers.PrimaryKeyRelatedField(queryset=ReferenceMeal.objects.none())
    total_nutrients = serializers.SerializerMethodField()

    class Meta:
        model = LoggedMeal
        fields = [
            "id",
            "trainee",
            "reference_meal",
            "reference_meal_label",
            "date",
            "eaten_at",
            "source",
            "meal_option_label",
            "items",
            "total_nutrients",
        ]
        # source is derived from the items' own sources (see _upsert), not
        # client-supplied - a meal mixing plan and off-plan items no longer
        # needs the client to pre-decide a single label for the whole thing.
        # reference_meal_label/meal_option_label are snapshots set in _upsert,
        # so they keep resolving once the plan meal/option is deleted.
        read_only_fields = ["trainee", "source", "reference_meal_label", "meal_option_label"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["reference_meal"].queryset = ReferenceMeal.objects.filter(diet_plan__trainee=request.user)

    def get_total_nutrients(self, obj):
        return obj.total_nutrients()

    def validate(self, attrs):
        items = attrs.get("items") or []
        if not items:
            raise serializers.ValidationError("At least one item is required.")

        reference_meal = attrs.get("reference_meal", getattr(self.instance, "reference_meal", None))
        # Only the plan version that applies to this day can be logged against
        # (never a draft, nor a version scheduled for later).
        day_plan = diet_plan_for_date(self.context["request"].user, attrs.get("date", getattr(self.instance, "date", None)))
        if day_plan is None or reference_meal.diet_plan_id != day_plan.id:
            raise serializers.ValidationError("That meal isn't part of your plan for this date.")
        for item in items:
            rmi = item.get("reference_meal_item")
            if rmi and rmi.option.meal_id != reference_meal.id:
                raise serializers.ValidationError("Every plan item must belong to the meal being logged.")
        return attrs

    def create(self, validated_data):
        return self._upsert(validated_data)

    def update(self, instance, validated_data):
        return self._upsert(validated_data)

    @staticmethod
    def _item_source(item):
        if item.get("reference_meal_item"):
            return FoodLog.Source.PLAN
        if item.get("quick_log_item"):
            return FoodLog.Source.QUICK
        if item.get("custom_name"):
            return FoodLog.Source.CUSTOM
        return FoodLog.Source.FOOD_ITEM

    def _upsert(self, validated_data):
        items_data = validated_data.pop("items")
        validated_data.pop("source", None)
        user = self.context["request"].user

        item_sources = {self._item_source(item) for item in items_data}
        if item_sources == {FoodLog.Source.PLAN}:
            meal_source = LoggedMeal.Source.PLAN
        elif FoodLog.Source.PLAN in item_sources:
            meal_source = LoggedMeal.Source.MIXED
        else:
            meal_source = LoggedMeal.Source.CUSTOM

        reference_meal = validated_data["reference_meal"]
        meal_option_label = None
        if meal_source == LoggedMeal.Source.PLAN:
            meal_option_label = items_data[0]["reference_meal_item"].option.label
        logged_meal, _ = LoggedMeal.objects.update_or_create(
            trainee=user,
            reference_meal=reference_meal,
            date=validated_data["date"],
            defaults={
                "source": meal_source,
                "reference_meal_label": reference_meal.label,
                "meal_option_label": meal_option_label,
                # Complete-state upsert: omitting it on a resave clears it.
                "eaten_at": validated_data.get("eaten_at"),
            },
        )
        logged_meal.items.all().delete()
        for item in items_data:
            FoodLog.objects.create(
                trainee=user,
                logged_meal=logged_meal,
                source=self._item_source(item),
                reference_meal_item=item.get("reference_meal_item"),
                food_item=item.get("food_item"),
                quick_log_item=item.get("quick_log_item"),
                actual_weight_grams=item.get("actual_weight_grams"),
                custom_name=item.get("custom_name"),
                # Only meaningful for a source=custom item - FoodLog.save()'s
                # _compute_nutrients() derives (and overwrites) these from the
                # linked item for every other source, so passing them through
                # unconditionally here is harmless.
                calories=item.get("calories"),
                protein_g=item.get("protein_g"),
                carbs_g=item.get("carbs_g"),
                fat_g=item.get("fat_g"),
                fiber_g=item.get("fiber_g"),
                sugar_g=item.get("sugar_g"),
                sodium_mg=item.get("sodium_mg"),
                potassium_mg=item.get("potassium_mg"),
                calcium_mg=item.get("calcium_mg"),
                iron_mg=item.get("iron_mg"),
                vitamin_c_mg=item.get("vitamin_c_mg"),
                vitamin_a_mcg=item.get("vitamin_a_mcg"),
            )
        return logged_meal
