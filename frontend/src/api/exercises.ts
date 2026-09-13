import { apiFetch } from './client'
import type { Exercise, ExerciseEditRequest, MuscleGroup, NewExercise, NewExerciseEditRequest } from './types'

/** Fetches the entire exercise bank (~100 rows) in one call - small enough that
 * search/filtering happens client-side, same shape as the food bank's
 * per-request search but without needing a server round-trip per keystroke. */
export function listExercises(): Promise<Exercise[]> {
  return apiFetch<Exercise[]>('/workouts/exercises/')
}

export function listMuscleGroups(): Promise<MuscleGroup[]> {
  return apiFetch<MuscleGroup[]>('/workouts/muscle-groups/')
}

export function createExercise(data: NewExercise): Promise<Exercise> {
  return apiFetch<Exercise>('/workouts/exercises/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateExercise(id: number, data: NewExercise): Promise<Exercise> {
  return apiFetch<Exercise>(`/workouts/exercises/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/** Fetched in full alongside the bank (trainers see every request, trainees only
 * their own - see ExerciseEditRequestViewSet.get_queryset) and grouped client-side
 * by exercise, same "one bulk call, small dataset" shape as listExercises. */
export function listExerciseEditRequests(): Promise<ExerciseEditRequest[]> {
  return apiFetch<ExerciseEditRequest[]>('/workouts/exercise-edit-requests/')
}

export function createExerciseEditRequest(data: NewExerciseEditRequest): Promise<ExerciseEditRequest> {
  return apiFetch<ExerciseEditRequest>('/workouts/exercise-edit-requests/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function resolveExerciseEditRequest(id: number): Promise<ExerciseEditRequest> {
  return apiFetch<ExerciseEditRequest>(`/workouts/exercise-edit-requests/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'resolved' }),
  })
}
