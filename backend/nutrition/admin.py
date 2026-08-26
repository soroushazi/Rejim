from django.contrib import admin

from .models import DietPlan, FoodItem, FoodLog, QuickLogItem, ReferenceMeal, ReferenceMealItem


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
    inlines = [ReferenceMealItemInline]


@admin.register(FoodLog)
class FoodLogAdmin(admin.ModelAdmin):
    list_display = ("trainee", "source", "actual_weight_grams", "calories", "logged_at")
    list_filter = ("trainee", "source")
