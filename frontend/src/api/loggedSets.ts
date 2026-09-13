import { apiFetch } from './client'
import type { ExerciseHistorySet } from './types'

/** Every past set for one exercise - powers the weight-suggestion banner, PR
 * badges, and the exercise history list/chart. Optional range narrows to a
 * date window (e.g. the Progress tab's selected period) without affecting
 * existing unbounded callers. Optional traineeId is required whenever a
 * trainer is viewing a specific trainee's history (e.g. Progress > Training >
 * Strength) - without it, TraineeScopedQuerysetMixin has no way to tell
 * "this trainee's sets" from "my own", which for a dual-role trainer account
 * silently returns their own (usually empty) history instead. */
export function listExerciseHistory(
  exerciseId: number,
  range?: { start?: string; end?: string },
  traineeId?: number,
): Promise<ExerciseHistorySet[]> {
  const params = new URLSearchParams({ exercise: String(exerciseId) })
  if (range?.start) params.set('start', range.start)
  if (range?.end) params.set('end', range.end)
  if (traineeId) params.set('trainee_id', String(traineeId))
  return apiFetch<ExerciseHistorySet[]>(`/workouts/logged-sets/?${params.toString()}`)
}
