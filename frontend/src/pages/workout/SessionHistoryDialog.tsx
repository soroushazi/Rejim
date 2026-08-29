import { useMemo, useState } from 'react'
import type { WorkoutSessionLog } from '@/api/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addDays, startOfMonth, startOfWeek, toDateKey } from '@/lib/date'
import { cn } from '@/lib/utils'
import SessionHistoryRow from './SessionHistoryRow'

type Period = 'week' | 'month' | 'all' | 'custom'

const PERIOD_LABEL: Record<Period, string> = {
  week: 'This week',
  month: 'This month',
  all: 'All time',
  custom: 'Custom',
}
const PERIOD_GRID: Period[] = ['week', 'month', 'all', 'custom']

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessions: WorkoutSessionLog[]
}

/** Independent of the Progress page's own period selector (which scopes the
 * frequency stat) - filtering session history shouldn't also change the
 * numbers in the cards above. */
export default function SessionHistoryDialog({ open, onOpenChange, sessions }: Props) {
  const [period, setPeriod] = useState<Period>('week')
  const [customStart, setCustomStart] = useState(() => addDays(toDateKey(new Date()), -6))
  const [customEnd, setCustomEnd] = useState(() => toDateKey(new Date()))

  const customRangeInvalid = period === 'custom' && customStart > customEnd

  const filtered = useMemo(() => {
    if (period === 'all') return sessions
    if (customRangeInvalid) return []
    const today = toDateKey(new Date())
    const start = period === 'week' ? startOfWeek() : period === 'month' ? startOfMonth() : customStart
    const end = period === 'custom' ? customEnd : today
    return sessions.filter((s) => s.date >= start && s.date <= end)
  }, [sessions, period, customStart, customEnd, customRangeInvalid])

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Session history</DialogTitle>
        </DialogHeader>

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
                <Label htmlFor="sh-custom-start">From</Label>
                <Input
                  id="sh-custom-start"
                  type="date"
                  value={customStart}
                  max={customEnd}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Label htmlFor="sh-custom-end">To</Label>
                <Input
                  id="sh-custom-end"
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

          {sorted.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No sessions logged in this period.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sorted.map((s) => (
                <SessionHistoryRow key={s.id} session={s} />
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
