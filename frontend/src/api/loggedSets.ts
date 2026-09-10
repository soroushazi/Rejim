import { apiFetch } from './client'
import type { ExerciseHistorySet } from './types'

/** Every past set for one exercise (this trainee only, server-enforced) -
 * powers the weight-suggestion banner, PR badges, and the exercise history
 * list/chart. Optional range narrows to a date window (e.g. the Progress
 * tab's selected period) without affecting existing unbounded callers. */
export function listExerciseHistory(
  exerciseId: number,
  range?: { start?: string; end?: string },
): Promise<ExerciseHistorySet[]> {
  const params = new URLSearchParams({ exercise: String(exerciseId) })
  if (range?.start) params.set('start', range.start)
  if (range?.end) params.set('end', range.end)
  return apiFetch<ExerciseHistorySet[]>(`/workouts/logged-sets/?${params.toString()}`)
}
