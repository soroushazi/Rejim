from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from workouts.models import DayOfWeek

from .services import scale_nutrients


class FoodItem(models.Model):
    class Source(models.TextChoices):
        SEEDED = "seeded", "Seeded"
        OPEN_FOOD_FACTS = "off", "Open Food Facts"

    name = models.CharField(max_length=255)
    barcode = models.CharField(max_length=64, null=True, blank=True, unique=True)
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.SEEDED)

    # Nutrition values per 100g of this food item.
    calories_per_100g = models.DecimalField(max_digits=7, decimal_places=2)
    protein_g_per_100g = models.DecimalField(max_digits=7, decimal_places=2)
    carbs_g_per_100g = models.DecimalField(max_digits=7, decimal_places=2)
    fat_g_per_100g = models.DecimalField(max_digits=7, decimal_places=2)
    fiber_g_per_100g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    sugar_g_per_100g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    sodium_mg_per_100g = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return self.name

    def nutrients_for_weight(self, weight_grams):
        return scale_nutrients(self, weight_grams)


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
        }
