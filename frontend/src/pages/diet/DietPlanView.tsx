import type { DietPlanDetail } from '@/api/types'
import DayAverageSummary from './DayAverageSummary'
import PlanMealCard from './PlanMealCard'

/** Read-only view of one diet plan version - the trainee's Diet -> Plan page,
 * its upcoming-version preview, and the trainer editor's "current plan" view
 * all render through this. */
export default function DietPlanView({ plan }: { plan: DietPlanDetail }) {
  const meals = [...plan.meals].sort((a, b) => a.order - b.order)

  return (
    <div className="flex flex-col gap-3">
      <DayAverageSummary nutrients={plan.average_daily_nutrients} />
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
