import { useMemo, useState } from 'react'
import type { LoggedMeal, Nutrients } from '@/api/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addDays, startOfMonth, startOfWeek, toDateKey } from '@/lib/date'
import { cn } from '@/lib/utils'
import ProgressDayCard from './ProgressDayCard'

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'

const PERIOD_LABEL: Record<Period, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'This week',
  month: 'This month',
  all: 'All time',
  custom: 'Custom',
}
const PERIOD_GRID: Period[] = ['today', 'yesterday', 'week', 'month', 'all', 'custom']

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  loggedMeals: LoggedMeal[]
  target: Nutrients
}

/** Independent of the Nutrition dashboard's own date-range control - filtering
 * diet history shouldn't also change the numbers in the cards above. Mirrors
 * SessionHistoryDialog's exact period selector; days are rendered with
 * ProgressDayCard, the same day-by-day renderer the trainee's own Diet →
 * Progress page already uses. */
export default function DietHistoryDialog({ open, onOpenChange, loggedMeals, target }: Props) {
  const [period, setPeriod] = useState<Period>('week')
  const [customStart, setCustomStart] = useState(() => addDays(toDateKey(new Date()), -6))
  const [customEnd, setCustomEnd] = useState(() => toDateKey(new Date()))

  const customRangeInvalid = period === 'custom' && customStart > customEnd

  const filtered = useMemo(() => {
    if (period === 'all') return loggedMeals
    if (customRangeInvalid) return []
    const today = toDateKey(new Date())
    let start: string
    let end: string
    if (period === 'today') {
      start = today
      end = today
    } else if (period === 'yesterday') {
      start = addDays(today, -1)
      end = addDays(today, -1)
    } else if (period === 'week') {
      start = startOfWeek()
      end = today
    } else if (period === 'month') {
      start = startOfMonth()
      end = today
    } else {
      start = customStart
      end = customEnd
    }
    return loggedMeals.filter((m) => m.date >= start && m.date <= end)
  }, [loggedMeals, period, customStart, customEnd, customRangeInvalid])

  const dayEntries = useMemo(() => {
    const grouped = new Map<string, LoggedMeal[]>()
    for (const meal of filtered) {
      const arr = grouped.get(meal.date) ?? []
      arr.push(meal)
      grouped.set(meal.date, arr)
    }
    return [...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const today = toDateKey(new Date())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] min-w-0 overflow-x-hidden overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Diet history</DialogTitle>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-3">
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
                <Label htmlFor="dh-custom-start">From</Label>
                <Input
                  id="dh-custom-start"
                  type="date"
                  value={customStart}
                  max={customEnd}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Label htmlFor="dh-custom-end">To</Label>
                <Input
                  id="dh-custom-end"
                  type="date"
                  value={customEnd}
                  min={customStart}
                  max={toDateKey(new Date())}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </div>
          )}
          {customRangeInvalid && (
            <p className="text-sm text-destructive">The start date must be before the end date.</p>
          )}

          {dayEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No meals logged in this period.</p>
          ) : (
            <ul className="flex min-w-0 flex-col gap-2">
              {dayEntries.map(([date, meals]) => (
                <ProgressDayCard key={date} date={date} isToday={date === today} loggedMeals={meals} target={target} />
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
