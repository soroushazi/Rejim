import { useEffect, useState } from 'react'
import { getDietPlan, listDietPlans } from '@/api/dietPlan'
import { listLoggedMealsRange } from '@/api/loggedMeals'
import type { DietPlanDetail, LoggedMeal } from '@/api/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addDays, startOfMonth, startOfWeek, toDateKey } from '@/lib/date'
import { averageNutrients, sumNutrients } from '@/lib/nutrients'
import { cn } from '@/lib/utils'
import ProgressDayCard from './ProgressDayCard'
import ProgressSummaryCard from './ProgressSummaryCard'
import ProgressTrendChart from './ProgressTrendChart'

type Period = 'week' | 'month' | 'all' | 'custom'

const PERIOD_LABEL: Record<Period, string> = {
  week: 'This week',
  month: 'This month',
  all: 'All time',
  custom: 'Custom',
}

// Top-left/top-right/bottom-left/bottom-right, per the user's requested layout.
const PERIOD_GRID: Period[] = ['week', 'month', 'all', 'custom']

function formatDateShort(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function DietProgressPage() {
  const [plan, setPlan] = useState<DietPlanDetail | null>(null)
  const [planLoading, setPlanLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('week')
  const [customStart, setCustomStart] = useState(() => addDays(toDateKey(new Date()), -6))
  const [customEnd, setCustomEnd] = useState(() => toDateKey(new Date()))
  const [loggedMeals, setLoggedMeals] = useState<LoggedMeal[]>([])
  const [rangeLoading, setRangeLoading] = useState(true)
  const [initialRangeLoaded, setInitialRangeLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const customRangeInvalid = period === 'custom' && customStart > customEnd

  useEffect(() => {
    let cancelled = false
    listDietPlans()
      .then((plans) => (plans.length ? getDietPlan(plans[0].id) : null))
      .then((detail) => {
        if (!cancelled) setPlan(detail)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setPlanLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (customRangeInvalid) {
      setLoggedMeals([])
      setHoverIndex(null)
      setRangeLoading(false)
      setInitialRangeLoaded(true)
      return
    }
    let cancelled = false
    setRangeLoading(true)
    setHoverIndex(null)
    const today = toDateKey(new Date())
    const end = period === 'custom' ? customEnd : today
    const start =
      period === 'week' ? startOfWeek() : period === 'month' ? startOfMonth() : period === 'custom' ? customStart : undefined
    listLoggedMealsRange(end, start)
      .then((data) => {
        if (!cancelled) {
          setLoggedMeals(data)
          setError(false)
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) {
          setRangeLoading(false)
          setInitialRangeLoaded(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [period, customStart, customEnd, customRangeInvalid])

  // Only the very first load shows the full-page loading state. A period switch
  // refetches in place - the previous chart/cards stay put (dimmed) instead of the
  // whole page flashing to "Loading…" and back, which read as a jarring jump.
  if (planLoading || (rangeLoading && !initialRangeLoaded)) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  }
  if (error) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">Couldn't load your progress.</p>
  }
  if (!plan) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">No diet plan yet.</p>
  }

  const grouped = new Map<string, LoggedMeal[]>()
  for (const meal of loggedMeals) {
    const arr = grouped.get(meal.date) ?? []
    arr.push(meal)
    grouped.set(meal.date, arr)
  }

  const dayEntries = [...grouped.entries()]
    .map(([date, meals]) => ({ date, meals, nutrients: sumNutrients(meals.map((m) => m.total_nutrients)) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const periodAverage = averageNutrients(dayEntries.map((d) => d.nutrients))
  const target = plan.average_daily_nutrients
  const today = toDateKey(new Date())

  const hovered = hoverIndex !== null ? dayEntries[hoverIndex] : null
  const periodHeading =
    period === 'custom'
      ? `${formatDateShort(customStart)} – ${formatDateShort(customEnd)} average`
      : `${PERIOD_LABEL[period]} average`
  const heading = hovered
    ? new Date(`${hovered.date}T00:00:00`).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : periodHeading

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {PERIOD_GRID.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              period === p
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="flex items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor="progress-custom-start">From</Label>
            <Input
              id="progress-custom-start"
              type="date"
              value={customStart}
              max={customEnd}
              onChange={(e) => setCustomStart(e.target.value)}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor="progress-custom-end">To</Label>
            <Input
              id="progress-custom-end"
              type="date"
              value={customEnd}
              min={customStart}
              max={toDateKey(new Date())}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        </div>
      )}
      {customRangeInvalid && <p className="text-sm text-destructive">The start date must be before the end date.</p>}

      <div className={cn('flex flex-col gap-3 transition-opacity duration-150', rangeLoading && 'opacity-40')}>
        <ProgressSummaryCard heading={heading} nutrients={hovered ? hovered.nutrients : periodAverage} target={target} />

        <ProgressTrendChart days={dayEntries} target={target} hoverIndex={hoverIndex} onHoverChange={setHoverIndex} />

        {dayEntries.length > 0 && (
          <ul className="flex flex-col gap-2">
            {[...dayEntries].reverse().map((entry) => (
              <ProgressDayCard
                key={entry.date}
                date={entry.date}
                isToday={entry.date === today}
                loggedMeals={entry.meals}
                target={target}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
