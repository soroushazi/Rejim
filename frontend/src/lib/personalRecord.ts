import type { ExerciseHistorySet } from '@/api/types'

export type PersonalRecordKind = 'weight' | 'reps' | null

/** Checks a newly-entered working set against prior (non-warmup) history for
 * this exercise: a new all-time max weight, or - at a weight already tried
 * before - a new max reps at that weight. Warm-up sets never trigger a PR and
 * are excluded from the comparison set, per spec. */
export function checkPersonalRecord(
  history: ExerciseHistorySet[],
  weight: number,
  reps: number,
  isWarmup: boolean,
): PersonalRecordKind {
  if (isWarmup || !Number.isFinite(weight) || !Number.isFinite(reps)) return null
  const working = history.filter((s) => !s.is_warmup)
  if (working.length === 0) return null

  const maxWeight = Math.max(...working.map((s) => Number(s.weight)))
  if (weight > maxWeight) return 'weight'

  const atSameWeight = working.filter((s) => Number(s.weight) === weight)
  if (atSameWeight.length === 0) return null
  const maxReps = Math.max(...atSameWeight.map((s) => s.reps_done))
  if (reps > maxReps) return 'reps'

  return null
}
