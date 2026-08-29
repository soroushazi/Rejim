import { apiFetch } from './client'
import type { Exercise, MuscleGroup } from './types'

/** Fetches the entire exercise bank (~100 rows) in one call - small enough that
 * search/filtering happens client-side, same shape as the food bank's
 * per-request search but without needing a server round-trip per keystroke. */
export function listExercises(): Promise<Exercise[]> {
  return apiFetch<Exercise[]>('/workouts/exercises/')
}

export function listMuscleGroups(): Promise<MuscleGroup[]> {
  return apiFetch<MuscleGroup[]>('/workouts/muscle-groups/')
}
