import { useEffect, useState } from 'react'
import { getWorkoutPlan, listWorkoutPlans } from '@/api/workoutPlans'
import { listWorkoutSessions } from '@/api/workoutSessions'
import type { WorkoutPlanDetail, WorkoutSessionLog } from '@/api/types'
import { toDateKey } from '@/lib/date'
import { nextSessionInRotation } from '@/lib/workoutRotation'
import SessionLogForm from './SessionLogForm'

export default function WorkoutLogPage() {
  const [plan, setPlan] = useState<WorkoutPlanDetail | null>(null)
  const [sessions, setSessions] = useState<WorkoutSessionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
  const [date, setDate] = useState(() => toDateKey(new Date()))

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
        const ordered = [...detail.sessions].sort((a, b) => a.order - b.order)
        const next = nextSessionInRotation(ordered, sessionLogs)
        setSelectedSessionId(next?.id ?? ordered[0]?.id ?? null)
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

  const existingLog = sessions.find((s) => s.plan_session === selectedSessionId && s.date === date) ?? null

  function handleSaved(log: WorkoutSessionLog) {
    setSessions((prev) => [log, ...prev.filter((s) => s.id !== log.id)])
  }
  function handleDeleted() {
    if (!existingLog) return
    setSessions((prev) => prev.filter((s) => s.id !== existingLog.id))
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
    />
  )
}
