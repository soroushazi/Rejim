import { useState } from 'react'
import type { DietPlanDetail, ReferenceMealDetail } from '@/api/types'
import DayAverageSummary from './DayAverageSummary'
import PlanMealCard from './PlanMealCard'
import PlanNutritionSummary from './plan-editor/PlanNutritionSummary'

/** Read-only view of one diet plan version - the trainee's Diet -> Plan page,
 * its upcoming-version preview, and the trainer editor's "current plan" view
 * all render through this. Once any meal has alternatives, a "Daily total"
 * card (the same one the plan editor uses) lets you pick one option per meal
 * and see that combination's calories/macros, alongside the plain average. */
export default function DietPlanView({ plan }: { plan: DietPlanDetail }) {
  const meals = [...plan.meals].sort((a, b) => a.order - b.order)
  // mealId -> optionId; a meal with no entry counts its first option.
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({})
  const hasAlternatives = meals.some((meal) => meal.options.length > 1)

  const selectedOptionFor = (meal: ReferenceMealDetail) => {
    const options = [...meal.options].sort((a, b) => a.order - b.order)
    return options.find((o) => o.id === selectedOptions[meal.id]) ?? options[0] ?? null
  }

  return (
    <div className="flex flex-col gap-3">
      <DayAverageSummary nutrients={plan.average_daily_nutrients} />
      {hasAlternatives && (
        <PlanNutritionSummary
          meals={meals.map((meal) => ({ ...meal, options: [...meal.options].sort((a, b) => a.order - b.order) }))}
          selectedOptionFor={selectedOptionFor}
          onSelectOption={(mealId, optionId) => setSelectedOptions((prev) => ({ ...prev, [mealId]: optionId }))}
          nutrientsFor={(option) => option.nutrients}
        />
      )}
      {meals.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">No meals in this plan yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {meals.map((meal) => (
            <PlanMealCard key={meal.id} meal={meal} />
          ))}
        </ul>
      )}
    </div>
  )
}
