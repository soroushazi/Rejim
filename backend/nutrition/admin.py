from django.contrib import admin

from .models import DietPlan, FoodItem, FoodLog, ReferenceMeal, ReferenceMealItem


class ReferenceMealInline(admin.TabularInline):
    model = ReferenceMeal
    extra = 1


class ReferenceMealItemInline(admin.TabularInline):
    model = ReferenceMealItem
    extra = 1


@admin.register(FoodItem)
class FoodItemAdmin(admin.ModelAdmin):
    list_display = ("name", "barcode", "source", "calories_per_100g", "protein_g_per_100g", "carbs_g_per_100g", "fat_g_per_100g")
    list_filter = ("source",)
    search_fields = ("name", "barcode")


@admin.register(DietPlan)
class DietPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "trainee", "created_at")
    inlines = [ReferenceMealInline]


@admin.register(ReferenceMeal)
class ReferenceMealAdmin(admin.ModelAdmin):
    list_display = ("diet_plan", "label", "order")
    inlines = [ReferenceMealItemInline]


@admin.register(FoodLog)
class FoodLogAdmin(admin.ModelAdmin):
    list_display = ("trainee", "reference_meal_item", "actual_weight_grams", "logged_at")
    list_filter = ("trainee",)
