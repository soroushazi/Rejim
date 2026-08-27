from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from accounts.models import User
from workouts.models import DayOfWeek

from .services import NUTRIENT_FIELDS, scale_nutrients


class FoodItem(models.Model):
    class Source(models.TextChoices):
        SEEDED = "seeded", "Seeded"
        OPEN_FOOD_FACTS = "off", "Open Food Facts"

    class Kind(models.TextChoices):
        SINGLE = "single", "Single item"
        COMPOSITE = "composite", "Multiple ingredients"

    class Visibility(models.TextChoices):
        PRIVATE = "private", "Private"
        PUBLIC = "public", "Public"

    class ApprovalStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    class ServingUnit(models.TextChoices):
        GRAM = "g", "Grams"
        CUP = "cup", "Cups"
        OUNCE = "oz", "Ounces"
        POUND = "lb", "Pounds"
        EACH = "each", "Each"
        SERVING = "serving", "Serving"

    name = models.CharField(max_length=255)
    barcode = models.CharField(max_length=64, null=True, blank=True, unique=True)
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.SEEDED)
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.SINGLE)

    # Who added this item. Null for CSV-seeded rows (no user context).
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_food_items",
    )
    # Private items are only visible to their creator. Public items are shared reference
    # data like the seeded/trainer-authored set, but a trainee's public submission needs
    # trainer approval before anyone besides the creator can see it.
    visibility = models.CharField(max_length=10, choices=Visibility.choices, default=Visibility.PUBLIC)
    approval_status = models.CharField(
        max_length=10, choices=ApprovalStatus.choices, default=ApprovalStatus.APPROVED
    )

    # A convenience unit for display/entry so contributors don't have to hand-convert a
    # nutrition label to per-100g themselves (e.g. "1 serving = 170g" for a yogurt tub).
    # Purely a display/entry aid - nutrient values below are always canonically per 100g,
    # and every other part of the app (logging, composites) stays gram-based.
    serving_unit = models.CharField(max_length=10, choices=ServingUnit.choices, default=ServingUnit.GRAM)
    serving_size_grams = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)

    # Nutrition values per 100g. For composite items these are computed from `components`
    # (see recompute_from_components) rather than entered directly.
    calories_per_100g = models.DecimalField(max_digits=7, decimal_places=2)
    protein_g_per_100g = models.DecimalField(max_digits=7, decimal_places=2)
    carbs_g_per_100g = models.DecimalField(max_digits=7, decimal_places=2)
    fat_g_per_100g = models.DecimalField(max_digits=7, decimal_places=2)
    fiber_g_per_100g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    sugar_g_per_100g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    sodium_mg_per_100g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    potassium_mg_per_100g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    calcium_mg_per_100g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    iron_mg_per_100g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    vitamin_c_mg_per_100g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    vitamin_a_mcg_per_100g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return self.name

    def nutrients_for_weight(self, weight_grams):
        return scale_nutrients(self, weight_grams)

    @classmethod
    def visible_to(cls, user):
        """FoodItems a given user is allowed to see: everyone's approved public items,
        plus anything the user created themselves (their own private/pending/rejected
        items). Trainers additionally see every public item regardless of approval
        status, so they can find and review pending submissions."""
        qs = cls.objects.all()
        if user.role == User.Role.TRAINER:
            return qs.filter(Q(visibility=cls.Visibility.PUBLIC) | Q(created_by=user)).distinct()
        return qs.filter(
            Q(visibility=cls.Visibility.PUBLIC, approval_status=cls.ApprovalStatus.APPROVED)
            | Q(created_by=user)
        ).distinct()

    def recompute_from_components(self):
        """Set this composite item's per-100g values from the weighted sum of its
        components, then save. No-op fields (no component supplied a value) stay None."""
        totals = {field: Decimal("0") for field in NUTRIENT_FIELDS}
        has_value = {field: False for field in NUTRIENT_FIELDS}
        total_weight = Decimal("0")
        for component in self.components.select_related("ingredient"):
            total_weight += component.weight_grams
            for field, value in component.ingredient.nutrients_for_weight(component.weight_grams).items():
                if value is not None:
                    totals[field] += value
                    has_value[field] = True
        if total_weight > 0:
            factor = Decimal(100) / total_weight
            for field in NUTRIENT_FIELDS:
                value = (totals[field] * factor) if has_value[field] else None
                setattr(self, f"{field}_per_100g", value)
        self.save()


class FoodItemComponent(models.Model):
    """One ingredient (by weight) inside a composite (multi-ingredient) FoodItem."""

    composite = models.ForeignKey(FoodItem, on_delete=models.CASCADE, related_name="components")
    ingredient = models.ForeignKey(FoodItem, on_delete=models.PROTECT, related_name="used_in_composites")
    weight_grams = models.DecimalField(max_digits=7, decimal_places=2)

    def __str__(self):
        return f"{self.composite.name} - {self.ingredient.name} ({self.weight_grams}g)"


class QuickLogItem(models.Model):
    """A trainee's own saved shortcut (e.g. "my smoothie") with fixed nutrition values.

    Private to the owner for Stage 1 — see CLAUDE.md for the deferred public/shared version.
    """

    trainee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "trainee"},
        related_name="quick_log_items",
    )
    name = models.CharField(max_length=255)

    # Fixed per-serving values (not scaled by weight - "I had one").
    calories = models.DecimalField(max_digits=7, decimal_places=2)
    protein_g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    carbs_g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    fat_g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    fiber_g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    sugar_g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    sodium_mg = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.trainee})"


class DietPlan(models.Model):
    trainee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "trainee"},
        related_name="diet_plans",
    )
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.trainee})"


class ReferenceMeal(models.Model):
    diet_plan = models.ForeignKey(DietPlan, on_delete=models.CASCADE, related_name="meals")
    label = models.CharField(max_length=100)
    day_of_week = models.PositiveSmallIntegerField(choices=DayOfWeek.choices, null=True, blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.diet_plan.name} - {self.label}"


class ReferenceMealItem(models.Model):
    meal = models.ForeignKey(ReferenceMeal, on_delete=models.CASCADE, related_name="items")
    food_item = models.ForeignKey(FoodItem, on_delete=models.PROTECT, related_name="reference_meal_items")
    reference_weight_grams = models.DecimalField(max_digits=7, decimal_places=2)

    def __str__(self):
        return f"{self.meal} - {self.food_item.name} ({self.reference_weight_grams}g)"

    def reference_nutrients(self):
        return self.food_item.nutrients_for_weight(self.reference_weight_grams)


class FoodLog(models.Model):
    class Source(models.TextChoices):
        PLAN = "plan", "Planned meal item"
        FOOD_ITEM = "food_item", "Food bank item (barcode/manual)"
        QUICK = "quick", "Quick-log item"

    trainee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "trainee"},
        related_name="food_logs",
    )
    # A model-level default is set only so the migration doesn't need a one-off
    # value for this NOT NULL column (the table starts empty); the API still
    # requires the client to pass it explicitly (see FoodLogSerializer).
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.PLAN)
    reference_meal_item = models.ForeignKey(
        ReferenceMealItem, on_delete=models.PROTECT, related_name="logs", null=True, blank=True
    )
    food_item = models.ForeignKey(FoodItem, on_delete=models.PROTECT, related_name="logs", null=True, blank=True)
    quick_log_item = models.ForeignKey(
        QuickLogItem, on_delete=models.PROTECT, related_name="logs", null=True, blank=True
    )
    actual_weight_grams = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    logged_at = models.DateTimeField(default=timezone.now)

    # Snapshot of computed nutrients at the time of logging, so later edits to a
    # FoodItem/QuickLogItem don't retroactively change historical logs.
    calories = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    protein_g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    carbs_g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    fat_g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    fiber_g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    sugar_g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    sodium_mg = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    potassium_mg = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    calcium_mg = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    iron_mg = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    vitamin_c_mg = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    vitamin_a_mcg = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ["-logged_at"]

    def __str__(self):
        return f"{self.trainee} - {self.get_source_display()} - {self.logged_at:%Y-%m-%d}"

    def clean(self):
        linked = [self.reference_meal_item_id, self.food_item_id, self.quick_log_item_id]
        if sum(bool(x) for x in linked) != 1:
            raise ValidationError("Exactly one of reference_meal_item, food_item, or quick_log_item must be set.")
        if self.source != self.Source.QUICK and self.actual_weight_grams is None:
            raise ValidationError("actual_weight_grams is required unless source is 'quick'.")

    def _compute_nutrients(self):
        if self.source == self.Source.PLAN:
            return self.reference_meal_item.food_item.nutrients_for_weight(self.actual_weight_grams)
        if self.source == self.Source.FOOD_ITEM:
            return self.food_item.nutrients_for_weight(self.actual_weight_grams)
        return {
            "calories": self.quick_log_item.calories,
            "protein_g": self.quick_log_item.protein_g,
            "carbs_g": self.quick_log_item.carbs_g,
            "fat_g": self.quick_log_item.fat_g,
            "fiber_g": self.quick_log_item.fiber_g,
            "sugar_g": self.quick_log_item.sugar_g,
            "sodium_mg": self.quick_log_item.sodium_mg,
            "potassium_mg": None,
            "calcium_mg": None,
            "iron_mg": None,
            "vitamin_c_mg": None,
            "vitamin_a_mcg": None,
        }

    def save(self, *args, **kwargs):
        self.clean()
        nutrients = self._compute_nutrients()
        for field, value in nutrients.items():
            setattr(self, field, value)
        super().save(*args, **kwargs)

    def actual_nutrients(self):
        return {
            "calories": self.calories,
            "protein_g": self.protein_g,
            "carbs_g": self.carbs_g,
            "fat_g": self.fat_g,
            "fiber_g": self.fiber_g,
            "sugar_g": self.sugar_g,
            "sodium_mg": self.sodium_mg,
            "potassium_mg": self.potassium_mg,
            "calcium_mg": self.calcium_mg,
            "iron_mg": self.iron_mg,
            "vitamin_c_mg": self.vitamin_c_mg,
            "vitamin_a_mcg": self.vitamin_a_mcg,
        }
