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

export type PrEvent = { date: string; kind: 'weight' | 'reps'; weight: number; reps: number }

/** Reconstructs the PR timeline for the Progress tab's Training dashboard by
 * replaying checkPersonalRecord chronologically: at each (non-warmup) set,
 * check it against everything strictly before it. Same PR rules as the
 * Log-time check, just run as a scan over history instead of one new set -
 * no new comparison logic. `history` should be the exercise's full, unbounded
 * history so earlier PRs aren't missed and later sets aren't misflagged. */
export function computePrTimeline(history: ExerciseHistorySet[]): PrEvent[] {
  const working = history
    .filter((s) => !s.is_warmup)
    .slice()
    .sort((a, b) => a.session_date.localeCompare(b.session_date) || a.set_number - b.set_number)

  const events: PrEvent[] = []
  const seenSoFar: ExerciseHistorySet[] = []
  for (const set of working) {
    const weight = Number(set.weight)
    const kind = checkPersonalRecord(seenSoFar, weight, set.reps_done, false)
    if (kind) {
      events.push({ date: set.session_date, kind, weight, reps: set.reps_done })
    }
    seenSoFar.push(set)
  }
  return events
}
