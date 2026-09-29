import { useEffect, useState } from 'react'
import { getDietPlanForDate } from '@/api/dietPlan'
import { listLoggedMeals } from '@/api/loggedMeals'
import type { DietPlanDetail, LoggedMeal } from '@/api/types'
import { caloriesStatus, proteinStatus, STATUS_TEXT_CLASS } from '@/lib/dietStatus'
import { sumNutrients } from '@/lib/nutrients'
import { cn, round } from '@/lib/utils'
import LogMealSlot from './LogMealSlot'

type Props = {
  date: string
  isToday: boolean
}

function formatDateLabel(date: string, isToday: boolean) {
  if (isToday) return 'Today'
  const d = new Date(`${date}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function LogDayCard({ date, isToday }: Props) {
  const [expanded, setExpanded] = useState(isToday)
  const [loggedMeals, setLoggedMeals] = useState<LoggedMeal[] | null>(null)
  // Each day loads its own plan version - the trainer may have changed the
  // plan between two days on this list (see backend accounts/plan_versions.py).
  const [plan, setPlan] = useState<DietPlanDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!expanded || loggedMeals !== null) return
    let cancelled = false
    setLoading(true)
    Promise.all([listLoggedMeals(date), getDietPlanForDate(date)])
      .then(([data, forDate]) => {
        if (cancelled) return
        setLoggedMeals(data)
        setPlan(forDate.plan)
      })
      .catch(() => {
        if (!cancelled) setLoggedMeals([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [expanded, date, loggedMeals])

  function handleCleared(referenceMealId: number) {
    setLoggedMeals((prev) => (prev ?? []).filter((m) => m.reference_meal !== referenceMealId))
  }

  const meals = plan ? [...plan.meals].sort((a, b) => a.order - b.order) : []
  const target = plan?.average_daily_nutrients ?? { calories: null, protein_g: null }
  const dayTotal = loggedMeals ? sumNutrients(loggedMeals.map((m) => m.total_nutrients)) : null
  const actualCalories = dayTotal ? (dayTotal.calories ?? 0) : null
  const actualProtein = dayTotal ? (dayTotal.protein_g ?? 0) : null
  const calStatus =
    actualCalories !== null && target.calories ? caloriesStatus(actualCalories, target.calories) : 'neutral'
  const proteinStat =
    actualProtein !== null && target.protein_g ? proteinStatus(actualProtein, target.protein_g) : 'neutral'
  const calPct = actualCalories !== null && target.calories ? Math.round((actualCalories / target.calories) * 100) : null

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full flex-col gap-1.5 px-3.5 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">{formatDateLabel(date, isToday)}</span>
          {expanded && dayTotal && (
            <span className={cn('whitespace-nowrap text-sm font-medium', STATUS_TEXT_CLASS[calStatus])}>
              {round(actualCalories ?? 0)} / {round(target.calories ?? 0)} kcal
              {calPct !== null ? ` · ${calPct}%` : ''}
            </span>
          )}
        </div>
        {expanded && dayTotal && (
          <div className="flex gap-3 text-sm text-muted-foreground">
            <span className={proteinStat === 'bad' ? STATUS_TEXT_CLASS.bad : undefined}>
              P {round(actualProtein ?? 0)}g
            </span>
            <span>C {round(dayTotal.carbs_g ?? 0)}g</span>
            <span>F {round(dayTotal.fat_g ?? 0)}g</span>
          </div>
        )}
      </button>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-border px-3.5 py-3">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && !plan && <p className="text-sm text-muted-foreground">No diet plan for this day.</p>}
          {!loading && plan && (
            <ul className="flex flex-col gap-2">
              {meals.map((meal) => (
                <LogMealSlot
                  key={meal.id}
                  meal={meal}
                  date={date}
                  loggedMeal={loggedMeals?.find((m) => m.reference_meal === meal.id) ?? null}
                  onCleared={handleCleared}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}
