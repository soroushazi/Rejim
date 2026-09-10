import { apiFetch } from './client'
import type { WorkoutPlanDetail, WorkoutPlanSummary } from './types'

export function listWorkoutPlans(traineeId?: number): Promise<WorkoutPlanSummary[]> {
  const query = traineeId ? `?trainee_id=${traineeId}` : ''
  return apiFetch<WorkoutPlanSummary[]>(`/workouts/plans/${query}`)
}

export function getWorkoutPlan(id: number): Promise<WorkoutPlanDetail> {
  return apiFetch<WorkoutPlanDetail>(`/workouts/plans/${id}/`)
}

export function createWorkoutPlan(data: { trainee: number; name: string; sessions_per_week: number }): Promise<WorkoutPlanSummary> {
  return apiFetch<WorkoutPlanSummary>('/workouts/plans/', { method: 'POST', body: JSON.stringify(data) })
}

export function updateWorkoutPlan(
  id: number,
  data: Partial<{ name: string; sessions_per_week: number }>,
): Promise<WorkoutPlanSummary> {
  return apiFetch<WorkoutPlanSummary>(`/workouts/plans/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function deleteWorkoutPlan(id: number): Promise<void> {
  return apiFetch<void>(`/workouts/plans/${id}/`, { method: 'DELETE' })
}

export type NewPlanSession = { plan: number; label: string; order: number; notes?: string }

export function createPlanSession(data: NewPlanSession): Promise<{ id: number }> {
  return apiFetch('/workouts/plan-sessions/', { method: 'POST', body: JSON.stringify(data) })
}

export function updatePlanSession(id: number, data: Partial<NewPlanSession>): Promise<{ id: number }> {
  return apiFetch(`/workouts/plan-sessions/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function deletePlanSession(id: number): Promise<void> {
  return apiFetch<void>(`/workouts/plan-sessions/${id}/`, { method: 'DELETE' })
}

/** Trainer-only (enforced server-side) - updates a session's guidance note. */
export function updatePlanSessionNotes(id: number, notes: string): Promise<{ notes: string }> {
  return apiFetch(`/workouts/plan-sessions/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  })
}

export type NewPlanExercise = {
  session: number
  exercise: number
  target_sets: number
  target_reps_min: number
  target_reps_max: number
  default_rest_seconds: number
  order: number
  notes?: string
}

export function createPlanExercise(data: NewPlanExercise): Promise<{ id: number }> {
  return apiFetch('/workouts/plan-exercises/', { method: 'POST', body: JSON.stringify(data) })
}

export function updatePlanExercise(id: number, data: Partial<NewPlanExercise>): Promise<{ id: number }> {
  return apiFetch(`/workouts/plan-exercises/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function deletePlanExercise(id: number): Promise<void> {
  return apiFetch<void>(`/workouts/plan-exercises/${id}/`, { method: 'DELETE' })
}

/** Trainer-only (enforced server-side) - updates one exercise's cue for a plan. */
export function updatePlanExerciseNotes(id: number, notes: string): Promise<{ notes: string }> {
  return apiFetch(`/workouts/plan-exercises/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  })
}
