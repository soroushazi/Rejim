import { apiFetch } from './client'
import type { WorkoutPlanDetail, WorkoutPlanSummary, PlanForDate } from './types'

export function listWorkoutPlans(traineeId?: number): Promise<WorkoutPlanSummary[]> {
  const query = traineeId ? `?trainee_id=${traineeId}` : ''
  return apiFetch<WorkoutPlanSummary[]>(`/workouts/plans/${query}`)
}

/** traineeId disambiguates a dual-role account's own retrieve requests (see
 * TraineeScopedQuerysetMixin) - the trainer dashboard always has one on hand
 * and must pass it, or a trainer who is also a trainee gets scoped to their
 * own records instead of the trainee's. Self-view pages omit it. */
export function getWorkoutPlan(id: number, traineeId?: number): Promise<WorkoutPlanDetail> {
  const query = traineeId ? `?trainee_id=${traineeId}` : ''
  return apiFetch<WorkoutPlanDetail>(`/workouts/plans/${id}/${query}`)
}

/** The plan version a given day uses (see backend accounts/plan_versions.py),
 * plus the next scheduled version if there is one. */
export function getWorkoutPlanForDate(date: string, traineeId?: number): Promise<PlanForDate<WorkoutPlanDetail, WorkoutPlanSummary>> {
  const params = new URLSearchParams({ date })
  if (traineeId) params.set('trainee_id', String(traineeId))
  return apiFetch(`/workouts/plans/for-date/?${params}`)
}

/** The trainee's draft/scheduled version to edit, created as a copy of the
 * live one if there isn't one yet. */
export function startWorkoutPlanEdit(traineeId: number): Promise<WorkoutPlanDetail> {
  return apiFetch<WorkoutPlanDetail>(`/workouts/plans/edit/`, { method: 'POST', body: JSON.stringify({ trainee: traineeId }) })
}

/** Publishes a draft (or moves a scheduled version) to start on effectiveFrom. */
export function publishWorkoutPlan(id: number, effectiveFrom: string): Promise<WorkoutPlanDetail> {
  return apiFetch<WorkoutPlanDetail>(`/workouts/plans/${id}/publish/`, {
    method: 'POST',
    body: JSON.stringify({ effective_from: effectiveFrom }),
  })
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

/** Trainer-only (enforced server-side) - links two exercises in the same
 * session as a superset. Always mirrored on both sides server-side; pairing
 * either one with a third exercise first unpairs its previous partner. */
export function pairPlanExercises(id: number, partnerId: number): Promise<{ id: number }> {
  return apiFetch(`/workouts/plan-exercises/${id}/pair/`, {
    method: 'POST',
    body: JSON.stringify({ partner: partnerId }),
  })
}

export function unpairPlanExercise(id: number): Promise<{ id: number }> {
  return apiFetch(`/workouts/plan-exercises/${id}/unpair/`, { method: 'POST' })
}
