import { useEffect, useMemo, useState } from 'react'
import { getWorkoutPlan, listWorkoutPlans } from '@/api/workoutPlans'
import { listWorkoutSessions } from '@/api/workoutSessions'
import type { WorkoutPlanDetail, WorkoutSessionLog } from '@/api/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addDays, startOfMonth, startOfWeek, toDateKey } from '@/lib/date'
import { computeTopMovers, type PlanExerciseInfo } from '@/lib/topMovers'
import { cn } from '@/lib/utils'
import { computeFrequency } from '@/lib/workoutFrequency'
import { computeStreak } from '@/lib/workoutStreak'
import ExerciseHistoryCard, { type LoggedExerciseOption } from './ExerciseHistoryCard'
import ExerciseHistoryDialog from './ExerciseHistoryDialog'
import SessionHistoryCard from './SessionHistoryCard'
import TopMoversSection from './TopMoversSection'
import WorkoutStatsSummary from './WorkoutStatsSummary'

type Period = 'week' | 'month' | 'all' | 'custom'

const PERIOD_LABEL: Record<Period, string> = {
  week: 'This week',
  month: 'This month',
  all: 'All time',
  custom: 'Custom',
}

// Top-left/top-right/bottom-left/bottom-right, same layout as Diet Progress.
const PERIOD_GRID: Period[] = ['week', 'month', 'all', 'custom']

export default function WorkoutProgressPage() {
  const [plan, setPlan] = useState<WorkoutPlanDetail | null>(null)
  const [sessions, setSessions] = useState<WorkoutSessionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [period, setPeriod] = useState<Period>('week')
  const [customStart, setCustomStart] = useState(() => addDays(toDateKey(new Date()), -6))
  const [customEnd, setCustomEnd] = useState(() => toDateKey(new Date()))
  const [historyExercise, setHistoryExercise] = useState<{ id: number; name: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    listWorkoutPlans()
      .then(async (plans) => {
        if (cancelled) return
        if (plans.length === 0) {
          setPlan(null)
          return
        }
        const [detail, sessionLogs] = await Promise.all([getWorkoutPlan(plans[0].id), listWorkoutSessions()])
        if (cancelled) return
        setPlan(detail)
        setSessions(sessionLogs)
        setError(false)
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

  const customRangeInvalid = period === 'custom' && customStart > customEnd

  // Fetched once, in full - period switches and the streak/top-movers/exercise
  // list below are all pure in-memory recomputation, no refetch.
  const planExerciseInfo = useMemo(() => {
    const map = new Map<number, PlanExerciseInfo>()
    if (!plan) return map
    for (const session of plan.sessions) {
      for (const ex of session.exercises) {
        map.set(ex.id, { exerciseId: ex.exercise, exerciseName: ex.exercise_name })
      }
    }
    return map
  }, [plan])

  const periodSessions = useMemo(() => {
    if (period === 'all') return sessions
    if (customRangeInvalid) return []
    const today = toDateKey(new Date())
    const start = period === 'week' ? startOfWeek() : period === 'month' ? startOfMonth() : customStart
    const end = period === 'custom' ? customEnd : today
    return sessions.filter((s) => s.date >= start && s.date <= end)
  }, [sessions, period, customStart, customEnd, customRangeInvalid])

  const frequency = useMemo(() => computeFrequency(periodSessions), [periodSessions])
  // Streak and top movers are always all-time - a streak or a trend scoped to
  // "this week" doesn't mean much, unlike the frequency/rest-days averages above.
  const streak = useMemo(
    () => computeStreak(sessions, plan?.sessions_per_week ?? 3),
    [sessions, plan?.sessions_per_week],
  )
  const { improving, declining } = useMemo(
    () => computeTopMovers(sessions, planExerciseInfo),
    [sessions, planExerciseInfo],
  )
  const loggedExercises = useMemo<LoggedExerciseOption[]>(() => {
    const seen = new Map<number, string>()
    for (const session of sessions) {
      for (const le of session.logged_exercises) {
        const info = planExerciseInfo.get(le.plan_exercise)
        if (info) seen.set(info.exerciseId, info.exerciseName)
      }
    }
    return [...seen.entries()].map(([exerciseId, exerciseName]) => ({ exerciseId, exerciseName }))
  }, [sessions, planExerciseInfo])

  if (loading) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  }
  if (error) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">Couldn't load your progress.</p>
  }
  if (!plan) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">No workout plan yet.</p>
  }

  function selectExercise(id: number, name: string) {
    setHistoryExercise({ id, name })
  }

  return (
    <div className="flex flex-col gap-4">
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
            <Label htmlFor="wp-custom-start">From</Label>
            <Input
              id="wp-custom-start"
              type="date"
              value={customStart}
              max={customEnd}
              onChange={(e) => setCustomStart(e.target.value)}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor="wp-custom-end">To</Label>
            <Input
              id="wp-custom-end"
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

      <WorkoutStatsSummary periodLabel={PERIOD_LABEL[period]} frequency={frequency} streak={streak} />

      <SessionHistoryCard sessions={sessions} />
      <ExerciseHistoryCard exercises={loggedExercises} />

      <TopMoversSection improving={improving} declining={declining} onSelectExercise={selectExercise} />

      <ExerciseHistoryDialog
        exerciseId={historyExercise?.id ?? null}
        exerciseName={historyExercise?.name ?? ''}
        onOpenChange={(open) => !open && setHistoryExercise(null)}
      />
    </div>
  )
}
