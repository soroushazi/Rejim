"""DietPlan-specific pieces of the effective-dated plan versioning in
accounts/plan_versions.py."""

from accounts.plan_versions import plan_for_date

from .models import DietPlan, LoggedMeal, MealOption, ReferenceMeal, ReferenceMealItem


def diet_versions(trainee):
    return DietPlan.objects.filter(trainee=trainee)


def started_diet_plan_ids(trainee, on_date):
    return LoggedMeal.objects.filter(trainee=trainee, date=on_date).values_list(
        "reference_meal__diet_plan_id", flat=True
    )


def diet_plan_for_date(trainee, on_date):
    return plan_for_date(diet_versions(trainee), on_date, started_diet_plan_ids(trainee, on_date))


def copy_diet_plan(plan):
    """A new draft version with the same meals -> options -> items."""
    new_plan = DietPlan.objects.create(trainee=plan.trainee, name=plan.name)
    for meal in plan.meals.all():
        new_meal = ReferenceMeal.objects.create(
            diet_plan=new_plan, label=meal.label, day_of_week=meal.day_of_week, order=meal.order
        )
        for option in meal.options.all():
            new_option = MealOption.objects.create(meal=new_meal, label=option.label, order=option.order)
            ReferenceMealItem.objects.bulk_create(
                ReferenceMealItem(
                    option=new_option, food_item_id=item.food_item_id, reference_weight_grams=item.reference_weight_grams
                )
                for item in option.items.all()
            )
    return new_plan
