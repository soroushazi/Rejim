import { apiFetch } from './client'
import type { ExerciseHistorySet } from './types'

/** Every past set for one exercise (this trainee only, server-enforced) -
 * powers the weight-suggestion banner, PR badges, and the exercise history
 * list/chart. */
export function listExerciseHistory(exerciseId: number): Promise<ExerciseHistorySet[]> {
  return apiFetch<ExerciseHistorySet[]>(`/workouts/logged-sets/?exercise=${exerciseId}`)
}
