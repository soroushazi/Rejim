import { useState } from 'react'
import type { LoggedMeal, Nutrients } from '@/api/types'
import { caloriesStatus, proteinStatus, STATUS_TEXT_CLASS } from '@/lib/dietStatus'
import { sumNutrients } from '@/lib/nutrients'
import { cn, round } from '@/lib/utils'
import ProgressMealRow from './ProgressMealRow'

type Props = {
  date: string
  isToday: boolean
  loggedMeals: LoggedMeal[]
  target: Nutrients
}

function formatDateLabel(date: string, isToday: boolean) {
  if (isToday) return 'Today'
  const d = new Date(`${date}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function ProgressDayCard({ date, isToday, loggedMeals, target }: Props) {
  const [expanded, setExpanded] = useState(false)

  const dayTotal = sumNutrients(loggedMeals.map((m) => m.total_nutrients))
  const actualCalories = dayTotal.calories
  const actualProtein = dayTotal.protein_g
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
          <span className={cn('whitespace-nowrap text-sm font-medium', STATUS_TEXT_CLASS[calStatus])}>
            {round(actualCalories ?? 0)} / {round(target.calories ?? 0)} kcal
            {calPct !== null ? ` · ${calPct}%` : ''}
          </span>
        </div>
        <div className="flex gap-3 text-sm text-muted-foreground">
          <span className={proteinStat === 'bad' ? STATUS_TEXT_CLASS.bad : undefined}>
            P {round(actualProtein ?? 0)}g
          </span>
          <span>C {round(dayTotal.carbs_g ?? 0)}g</span>
          <span>F {round(dayTotal.fat_g ?? 0)}g</span>
        </div>
      </button>

      {expanded && (
        <ul className="flex flex-col gap-2 border-t border-border px-3.5 py-3">
          {loggedMeals.map((meal) => (
            <ProgressMealRow key={meal.id} meal={meal} />
          ))}
        </ul>
      )}
    </li>
  )
}
