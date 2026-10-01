import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getWorkoutPlanForDate } from '@/api/workoutPlans'
import { listWorkoutSessions } from '@/api/workoutSessions'
import type { PlanSessionDetail, WorkoutPlanDetail, WorkoutSessionLog } from '@/api/types'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toDateKey } from '@/lib/date'
import { nextSessionInRotation } from '@/lib/workoutRotation'
import type { EditWorkoutLogState } from './EditWorkoutLogButton'
import SessionHistoryRow from './SessionHistoryRow'
import SessionLogForm from './SessionLogForm'

/** Logs on `date` that still belong to `plan` (an orphaned log - its plan
 * session since removed - can't be reopened in the form, so it's left to
 * history). Newest first, same as the API. */
function logsOn(date: string, plan: WorkoutPlanDetail | null, logs: WorkoutSessionLog[]): WorkoutSessionLog[] {
  if (!plan) return []
  const ids = new Set(plan.sessions.map((s) => s.id))
  return logs.filter((l) => l.date === date && l.plan_session !== null && ids.has(l.plan_session))
}

/** The session after `planSessionId` in the rotation, wrapping around. */
function sessionAfter(ordered: PlanSessionDetail[], planSessionId: number | null): PlanSessionDetail | undefined {
  const index = ordered.findIndex((s) => s.id === planSessionId)
  return index === -1 ? ordered[0] : ordered[(index + 1) % ordered.length]
}

function formatDay(date: string): string {
  if (date === toDateKey(new Date())) return 'today'
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

/** Workout -> Log. A day that already has a logged workout opens on that log
 * (read-only, with "Edit workout") rather than jumping ahead to the next
 * session in the rotation - otherwise a just-saved workout disappears the
 * moment the page re-opens, with no obvious way back to fix a mistake. A
 * second session on the same day is still possible via "Go to next session",
 * behind a confirmation since it's rarely intended. */
export default function WorkoutLogPage() {
  const location = useLocation()
  const navigate = useNavigate()
  // Set when arriving from history's "Edit workout" (see EditWorkoutLogButton) -
  // consumed once, on the first load for that date.
  const editRequest = useRef((location.state as Partial<EditWorkoutLogState> | null)?.editWorkoutLog ?? null)

  const [plan, setPlan] = useState<WorkoutPlanDetail | null>(null)
  const [sessions, setSessions] = useState<WorkoutSessionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
  const [date, setDate] = useState(() => editRequest.current?.date ?? toDateKey(new Date()))
  // 'review' = the day's logged workout(s), read-only; 'form' = SessionLogForm.
  const [mode, setMode] = useState<'review' | 'form'>('form')
  const [anotherSessionOpen, setAnotherSessionOpen] = useState(false)

  // The selected session follows the plan version: re-picked from the rotation
  // whenever the chosen date resolves to a different version than before
  // (which restarts a brand-new version at its first session), kept as-is
  // when it's the same version - unless that date already has a log, which
  // then takes over (see the page doc comment).
  const planIdRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getWorkoutPlanForDate(date), listWorkoutSessions()])
      .then(([{ plan: detail }, sessionLogs]) => {
        if (cancelled) return
        setPlan(detail)
        setSessions(sessionLogs)
        const ordered = detail ? [...detail.sessions].sort((a, b) => a.order - b.order) : []
        if (detail && detail.id !== planIdRef.current) {
          const next = nextSessionInRotation(ordered, sessionLogs)
          setSelectedSessionId(next?.id ?? ordered[0]?.id ?? null)
        }
        planIdRef.current = detail?.id ?? null

        const dayLogs = logsOn(date, detail, sessionLogs)
        const request = editRequest.current
        if (request && request.date === date) {
          editRequest.current = null
          // Drop the router state so a refresh doesn't re-open the editor.
          navigate(location.pathname, { replace: true, state: null })
          const target = dayLogs.find((l) => l.plan_session === request.planSessionId) ?? dayLogs[0]
          if (target) {
            setSelectedSessionId(target.plan_session)
            setMode('form')
            return
          }
        }
        if (dayLogs.length > 0) {
          setSelectedSessionId(dayLogs[0].plan_session)
          setMode('review')
        } else {
          setMode('form')
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  if (loading) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  }
  if (error) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">Couldn't load your workout plan.</p>
  }
  if (!plan) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">No workout plan yet.</p>
  }

  const orderedSessions = [...plan.sessions].sort((a, b) => a.order - b.order)
  if (orderedSessions.length === 0 || selectedSessionId === null) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">This plan has no sessions yet.</p>
  }

  const dayLogs = logsOn(date, plan, sessions)
  const existingLog = sessions.find((s) => s.plan_session === selectedSessionId && s.date === date) ?? null
  const day = formatDay(date)

  function handleSaved(log: WorkoutSessionLog) {
    setSessions((prev) => [log, ...prev.filter((s) => s.id !== log.id)])
    // Land on the day's log view, so what was just saved stays in sight.
    setSelectedSessionId(log.plan_session)
    setMode('review')
  }
  function handleDeleted() {
    if (!existingLog) return
    const remaining = sessions.filter((s) => s.id !== existingLog.id)
    setSessions(remaining)
    if (logsOn(date, plan, remaining).length > 0) setMode('review')
  }

  function editLog(log: WorkoutSessionLog) {
    setSelectedSessionId(log.plan_session)
    setMode('form')
  }

  function startAnotherSession() {
    const next = sessionAfter(orderedSessions, dayLogs[0]?.plan_session ?? null)
    if (next) setSelectedSessionId(next.id)
    setMode('form')
  }

  if (mode === 'review' && dayLogs.length > 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="review-date">Date</Label>
          <Input
            id="review-date"
            type="date"
            value={date}
            max={toDateKey(new Date())}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <p className="text-sm font-medium">
          {day === 'today' ? "Today's workout" : `Workout logged on ${day}`}
        </p>
        {dayLogs.map((log) => (
          <div key={log.id} className="flex flex-col gap-2">
            <ul>
              <SessionHistoryRow session={log} defaultExpanded />
            </ul>
            <Button type="button" className="w-full" onClick={() => editLog(log)}>
              Edit workout{dayLogs.length > 1 ? ` (${log.plan_session_label})` : ''}
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" className="w-full" onClick={() => setAnotherSessionOpen(true)}>
          Go to next session
        </Button>

        <ConfirmDialog
          open={anotherSessionOpen}
          onOpenChange={setAnotherSessionOpen}
          variant="default"
          title="Log another workout session?"
          description={`You already logged a workout ${day === 'today' ? 'today' : `on ${day}`}. You're selecting to do another workout session on the same day. Are you sure?`}
          confirmLabel="Yes, next session"
          confirmingLabel="Opening…"
          onConfirm={startAnotherSession}
        />
      </div>
    )
  }

  return (
    <SessionLogForm
      sessions={orderedSessions}
      selectedSessionId={selectedSessionId}
      onSelectSession={setSelectedSessionId}
      date={date}
      onDateChange={setDate}
      existingLog={existingLog}
      onSaved={handleSaved}
      onDeleted={handleDeleted}
      isFirstLog={sessions.length === 0}
      footer={
        dayLogs.length > 0 ? (
          <Button type="button" variant="ghost" className="w-full" onClick={() => setMode('review')}>
            {existingLog ? `Back to ${day === 'today' ? "today's" : `${day}'s`} workout` : `Back to the session you did ${day}`}
          </Button>
        ) : null
      }
    />
  )
}
