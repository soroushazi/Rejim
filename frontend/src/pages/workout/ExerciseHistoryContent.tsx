import { useEffect, useState } from 'react'
import { listExerciseHistory } from '@/api/loggedSets'
import type { ExerciseHistorySet } from '@/api/types'
import type { PrEvent } from '@/lib/personalRecord'
import ExerciseHistoryChart from './ExerciseHistoryChart'

type Props = {
  exerciseId: number
  /** Narrows the fetched/displayed history to a date window - used by the
   * top-level Progress tab's Training dashboard, which shares the page's
   * selected date range. Absent for the Log-time popup and Workout Progress's
   * own history card, both of which want the full all-time history. */
  range?: { start?: string; end?: string }
  /** PR markers to draw on the chart (see lib/personalRecord.ts::computePrTimeline) -
   * computed by the caller from the exercise's *unbounded* history, since a PR
   * check needs everything before it, not just what's in `range`. */
  prEvents?: PrEvent[]
}

/** Fetches and renders one exercise's history (chart + date-grouped set list) -
 * shared between the Log-time popup (ExerciseHistoryDialog) and the Progress
 * page's inline exercise-history card, so both stay in sync automatically. */
export default function ExerciseHistoryContent({ exerciseId, range, prEvents }: Props) {
  const [history, setHistory] = useState<ExerciseHistorySet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listExerciseHistory(exerciseId, range)
      .then((data) => {
        if (!cancelled) setHistory(data)
      })
      .catch(() => {
        if (!cancelled) setHistory([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId, range?.start, range?.end])

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }
  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No history available — this is your first time doing this exercise.
      </p>
    )
  }

  const byDate = new Map<string, ExerciseHistorySet[]>()
  for (const s of history) {
    const arr = byDate.get(s.session_date) ?? []
    arr.push(s)
    byDate.set(s.session_date, arr)
  }
  const days = [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <div className="flex flex-col gap-4">
      <ExerciseHistoryChart history={history} prEvents={prEvents} />
      <div className="flex flex-col gap-2 border-t border-border pt-3">
        {days.map(([date, sets]) => (
          <div key={date} className="rounded-lg border border-border p-2.5">
            <p className="mb-1.5 text-sm font-medium">
              {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </p>
            <ul className="flex flex-col gap-1 text-sm">
              {sets
                .sort((a, b) => a.set_number - b.set_number)
                .map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-muted-foreground">
                    <span>
                      Set {s.set_number}
                      {s.is_warmup ? ' · warm-up' : ''}
                    </span>
                    <span>
                      {s.weight}
                      {s.weight_unit} × {s.reps_done}
                      {s.rpe !== null ? ` · RPE ${s.rpe}` : ''}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
