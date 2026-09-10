import { useEffect, useState } from 'react'
import { getDailySummary } from '@/api/dailySummary'
import type { DailySummary } from '@/api/types'
import { caloriesStatus, proteinStatus, STATUS_TEXT_CLASS } from '@/lib/dietStatus'
import { cn, round } from '@/lib/utils'

type Props = {
  date: string
  /** Bump this to force a refetch (e.g. after an ActivityLog add/edit/delete
   * changes calories_burned) without the date itself changing. */
  refreshKey?: number
}

export default function DailySummaryCard({ date, refreshKey }: Props) {
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    getDailySummary(date)
      .then((data) => {
        if (!cancelled) setSummary(data)
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
  }, [date, refreshKey])

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (error || !summary) return <p className="text-sm text-muted-foreground">Couldn't load the summary.</p>

  const consumedCalories = summary.consumed.calories ?? 0
  const plannedCalories = summary.planned?.calories ?? null
  const calStatus = plannedCalories ? caloriesStatus(consumedCalories, plannedCalories) : 'neutral'

  const consumedProtein = summary.consumed.protein_g ?? 0
  const plannedProtein = summary.planned?.protein_g ?? null
  const proteinStat = plannedProtein ? proteinStatus(consumedProtein, plannedProtein) : 'neutral'

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 px-2 py-2.5">
          <span className="text-xs text-muted-foreground">Calories in</span>
          <span className={cn('text-lg font-semibold', STATUS_TEXT_CLASS[calStatus])}>{round(consumedCalories)}</span>
          {plannedCalories !== null && <span className="text-xs text-muted-foreground">of {round(plannedCalories)}</span>}
        </div>
        <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 px-2 py-2.5">
          <span className="text-xs text-muted-foreground">Calories out</span>
          <span className="text-lg font-semibold">{round(summary.calories_burned)}</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 px-2 py-2.5">
          <span className="text-xs text-muted-foreground">Net</span>
          <span className="text-lg font-semibold">{round(summary.net_calories)}</span>
        </div>
      </div>
      <div className="flex gap-3 text-sm">
        <span className={proteinStat === 'bad' ? STATUS_TEXT_CLASS.bad : undefined}>
          P {round(consumedProtein)}g{plannedProtein !== null ? ` / ${round(plannedProtein)}g` : ''}
        </span>
        <span className="text-muted-foreground">
          C {round(summary.consumed.carbs_g ?? 0)}g
          {summary.planned ? ` / ${round(summary.planned.carbs_g ?? 0)}g` : ''}
        </span>
        <span className="text-muted-foreground">
          F {round(summary.consumed.fat_g ?? 0)}g{summary.planned ? ` / ${round(summary.planned.fat_g ?? 0)}g` : ''}
        </span>
      </div>
    </div>
  )
}
