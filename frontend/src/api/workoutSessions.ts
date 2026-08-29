import { apiFetch } from './client'
import type { NewWorkoutSessionLog, WorkoutSessionLog } from './types'

/** Fetches every logged session for the trainee (or, for a trainer, one of
 * their trainees) - small enough at Stage 1 scale to fetch in full and derive
 * "next session in rotation" / "already logged today" client-side. */
export function listWorkoutSessions(): Promise<WorkoutSessionLog[]> {
  return apiFetch<WorkoutSessionLog[]>('/workouts/sessions/')
}

/** Always posts the complete current state for a session log; the backend
 * upserts on (trainee, plan_session, date) - see WorkoutSessionSerializer. */
export function saveWorkoutSession(data: NewWorkoutSessionLog): Promise<WorkoutSessionLog> {
  return apiFetch<WorkoutSessionLog>('/workouts/sessions/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function deleteWorkoutSession(id: number): Promise<void> {
  return apiFetch<void>(`/workouts/sessions/${id}/`, { method: 'DELETE' })
}
