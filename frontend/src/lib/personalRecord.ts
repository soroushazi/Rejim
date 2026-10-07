import type { ExerciseHistorySet } from '@/api/types'
import { averagedWeightReps } from './setMeasure'

export type PersonalRecordKind = 'weight' | 'reps' | null

type MeasuredSet = { weight: number; reps: number }

/** Working sets only, each reduced to one weight/reps pair - a per-side
 * (Exercise.is_unilateral) set counts as the average of its two sides (see
 * lib/setMeasure.ts). */
function measuredWorkingSets(history: ExerciseHistorySet[]): MeasuredSet[] {
  return history
    .filter((s) => !s.is_warmup && !s.is_dropset)
    .map(averagedWeightReps)
    .filter((m): m is MeasuredSet => m !== null)
}

function compareToPrior(prior: MeasuredSet[], weight: number, reps: number): PersonalRecordKind {
  if (prior.length === 0) return null

  const maxWeight = Math.max(...prior.map((s) => s.weight))
  if (weight > maxWeight) return 'weight'

  const atSameWeight = prior.filter((s) => s.weight === weight)
  if (atSameWeight.length === 0) return null
  const maxReps = Math.max(...atSameWeight.map((s) => s.reps))
  if (reps > maxReps) return 'reps'

  return null
}

/** Checks a newly-entered working set against prior (non-warmup, non-dropset)
 * history for this exercise: a new all-time max weight, or - at a weight
 * already tried before - a new max reps at that weight. Warm-up and drop
 * sets never trigger a PR and are excluded from the comparison set, per spec.
 * For a per-side set, pass the average of its two sides as weight/reps. */
export function checkPersonalRecord(
  history: ExerciseHistorySet[],
  weight: number,
  reps: number,
  isWarmup: boolean,
  isDropset: boolean,
): PersonalRecordKind {
  if (isWarmup || isDropset || !Number.isFinite(weight) || !Number.isFinite(reps)) return null
  return compareToPrior(measuredWorkingSets(history), weight, reps)
}

export type PrEvent = { date: string; kind: 'weight' | 'reps'; weight: number; reps: number }

/** Reconstructs the PR timeline for the Progress tab's Training dashboard by
 * replaying the same check chronologically: at each (non-warmup) set,
 * check it against everything strictly before it. Same PR rules as the
 * Log-time check, just run as a scan over history instead of one new set -
 * no new comparison logic. `history` should be the exercise's full, unbounded
 * history so earlier PRs aren't missed and later sets aren't misflagged. */
export function computePrTimeline(history: ExerciseHistorySet[]): PrEvent[] {
  const working = history
    .filter((s) => !s.is_warmup && !s.is_dropset)
    .slice()
    .sort((a, b) => a.session_date.localeCompare(b.session_date) || a.set_number - b.set_number)

  const events: PrEvent[] = []
  const seenSoFar: MeasuredSet[] = []
  for (const set of working) {
    const measured = averagedWeightReps(set)
    if (measured === null) continue
    const kind = compareToPrior(seenSoFar, measured.weight, measured.reps)
    if (kind) {
      events.push({ date: set.session_date, kind, weight: measured.weight, reps: measured.reps })
    }
    seenSoFar.push(measured)
  }
  return events
}

/** checkPersonalRecord for a set still being logged (strings, '' = not
 * entered): a per-side set is compared by the average of its two sides,
 * a normal set by its own weight/reps. */
export function checkDraftSetPersonalRecord(
  history: ExerciseHistorySet[],
  set: {
    weight: string
    reps_done: string
    weight_left: string
    weight_right: string
    reps_done_left: string
    reps_done_right: string
    is_warmup: boolean
    is_dropset: boolean
  },
  isUnilateral: boolean,
): PersonalRecordKind {
  // A draft carries both shapes' fields - only the one matching the
  // exercise counts (the other can hold stale values, e.g. after a swap).
  const measured = averagedWeightReps(isUnilateral ? { ...set, weight: null, reps_done: null } : { weight: set.weight, reps_done: set.reps_done })
  if (measured === null) return null
  return checkPersonalRecord(history, measured.weight, measured.reps, set.is_warmup, set.is_dropset)
}
