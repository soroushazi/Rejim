from django.contrib import admin

from .models import DietPlan, FoodItem, FoodLog, LoggedMeal, MealOption, QuickLogItem, ReferenceMeal, ReferenceMealItem


class ReferenceMealInline(admin.TabularInline):
    model = ReferenceMeal
    extra = 1


class MealOptionInline(admin.TabularInline):
    model = MealOption
    extra = 1


class ReferenceMealItemInline(admin.TabularInline):
    model = ReferenceMealItem
    extra = 1


@admin.register(FoodItem)
class FoodItemAdmin(admin.ModelAdmin):
    list_display = ("name", "barcode", "source", "calories_per_100g", "protein_g_per_100g", "carbs_g_per_100g", "fat_g_per_100g")
    list_filter = ("source",)
    search_fields = ("name", "barcode")


@admin.register(QuickLogItem)
class QuickLogItemAdmin(admin.ModelAdmin):
    list_display = ("name", "trainee", "calories", "created_at")
    list_filter = ("trainee",)
    search_fields = ("name",)


@admin.register(DietPlan)
class DietPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "trainee", "created_at")
    inlines = [ReferenceMealInline]


@admin.register(ReferenceMeal)
class ReferenceMealAdmin(admin.ModelAdmin):
    list_display = ("diet_plan", "label", "day_of_week", "order")
    inlines = [MealOptionInline]


@admin.register(MealOption)
class MealOptionAdmin(admin.ModelAdmin):
    list_display = ("meal", "label", "order")
    inlines = [ReferenceMealItemInline]


@admin.register(FoodLog)
class FoodLogAdmin(admin.ModelAdmin):
    list_display = ("trainee", "source", "actual_weight_grams", "calories", "logged_at")
    list_filter = ("trainee", "source")


class LoggedMealItemInline(admin.TabularInline):
    model = FoodLog
    fk_name = "logged_meal"
    extra = 0
    fields = ("source", "reference_meal_item", "food_item", "actual_weight_grams", "calories")
    readonly_fields = ("calories",)


@admin.register(LoggedMeal)
class LoggedMealAdmin(admin.ModelAdmin):
    list_display = ("trainee", "reference_meal", "date", "source")
    list_filter = ("trainee", "source")
    inlines = [LoggedMealItemInline]
