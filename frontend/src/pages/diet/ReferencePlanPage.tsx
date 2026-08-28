import { useEffect, useState } from 'react'
import { getDietPlan, listDietPlans } from '@/api/dietPlan'
import type { DietPlanDetail } from '@/api/types'
import DayAverageSummary from './DayAverageSummary'
import PlanMealCard from './PlanMealCard'

export default function ReferencePlanPage() {
  const [plan, setPlan] = useState<DietPlanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listDietPlans()
      .then((plans) => (plans.length ? getDietPlan(plans[0].id) : null))
      .then((detail) => {
        if (!cancelled) {
          setPlan(detail)
          setError(false)
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  }
  if (error) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">Couldn't load the diet plan.</p>
  }
  if (!plan) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">No diet plan yet.</p>
  }

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
