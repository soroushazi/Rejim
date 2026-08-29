import { apiFetch } from './client'
import type { WorkoutPlanDetail, WorkoutPlanSummary } from './types'

export function listWorkoutPlans(): Promise<WorkoutPlanSummary[]> {
  return apiFetch<WorkoutPlanSummary[]>('/workouts/plans/')
}

export function getWorkoutPlan(id: number): Promise<WorkoutPlanDetail> {
  return apiFetch<WorkoutPlanDetail>(`/workouts/plans/${id}/`)
}

/** Trainer-only (enforced server-side) - updates a session's guidance note. */
export function updatePlanSessionNotes(id: number, notes: string): Promise<{ notes: string }> {
  return apiFetch(`/workouts/plan-sessions/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  })
}

/** Trainer-only (enforced server-side) - updates one exercise's cue for a plan. */
export function updatePlanExerciseNotes(id: number, notes: string): Promise<{ notes: string }> {
  return apiFetch(`/workouts/plan-exercises/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  })
}
