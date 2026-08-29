import type { PlanSessionDetail, WorkoutSessionLog } from '@/api/types'

/** The next session in the plan's rotation: the one after whichever session
 * was most recently logged (any date), wrapping back to the first after the
 * last. Defaults to the plan's first session if nothing has been logged yet.
 * `recentSessions` is expected newest-first (the API's default ordering). */
export function nextSessionInRotation(
  sessions: PlanSessionDetail[],
  recentSessions: WorkoutSessionLog[],
): PlanSessionDetail | undefined {
  if (sessions.length === 0) return undefined
  const ordered = [...sessions].sort((a, b) => a.order - b.order)
  const lastLogged = recentSessions[0]
  if (!lastLogged) return ordered[0]
  const lastIndex = ordered.findIndex((s) => s.id === lastLogged.plan_session)
  if (lastIndex === -1) return ordered[0]
  return ordered[(lastIndex + 1) % ordered.length]
}
