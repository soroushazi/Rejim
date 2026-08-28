import { useState } from 'react'
import type { ReferenceMealDetail } from '@/api/types'
import { round } from '@/lib/utils'
import PlanOptionRow from './PlanOptionRow'

export default function PlanMealCard({ meal }: { meal: ReferenceMealDetail }) {
  const [expanded, setExpanded] = useState(false)
  const { average_nutrients: avg } = meal
  const options = [...meal.options].sort((a, b) => a.order - b.order)

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full flex-col gap-1.5 px-3.5 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">{meal.label}</span>
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {avg.calories !== null ? `avg ${round(avg.calories)} kcal` : '—'}
          </span>
        </div>
        <div className="flex gap-3 text-sm text-muted-foreground">
          <span>P {avg.protein_g !== null ? round(avg.protein_g) : '—'}g</span>
          <span>C {avg.carbs_g !== null ? round(avg.carbs_g) : '—'}g</span>
          <span>F {avg.fat_g !== null ? round(avg.fat_g) : '—'}g</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {options.length} option{options.length === 1 ? '' : 's'} · choose one
        </span>
      </button>

      {expanded && (
        <ul className="flex flex-col gap-2 border-t border-border px-3.5 py-3">
          {options.map((option, index) => (
            <PlanOptionRow key={option.id} option={option} letter={String.fromCharCode(65 + index)} />
          ))}
        </ul>
      )}
    </li>
  )
}
