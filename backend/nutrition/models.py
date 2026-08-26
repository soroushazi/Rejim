from django.conf import settings
from django.db import models
from django.utils import timezone

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
    trainee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "trainee"},
        related_name="food_logs",
    )
    reference_meal_item = models.ForeignKey(ReferenceMealItem, on_delete=models.PROTECT, related_name="logs")
    actual_weight_grams = models.DecimalField(max_digits=7, decimal_places=2)
    logged_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-logged_at"]

    def __str__(self):
        return f"{self.trainee} - {self.reference_meal_item} - {self.actual_weight_grams}g"

    def actual_nutrients(self):
        return self.reference_meal_item.food_item.nutrients_for_weight(self.actual_weight_grams)
