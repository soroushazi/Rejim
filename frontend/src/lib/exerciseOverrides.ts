import type { PlanExerciseDetail } from '@/api/types'

/** A trainee's per-log-session override of one plan exercise, set via the
 * "Off-program exercise" dialog. Neither field is a permanent plan edit -
 * both apply only to the session being logged right now (see
 * WorkoutSessionSerializer.superset_partner/substituted_exercise). */
export type ExerciseOverride = {
  /** Off-program swap: do this exercise instead of the planned one, keeping
   * its target sets/reps/rest. Null = log the planned exercise as normal. */
  substitutedExercise: number | null
  /** Ad hoc superset pairing for today only, as a plan_exercise id.
   * `undefined` = no override, defer to the plan's own PlanExercise.superset_with;
   * `null` = explicitly unpaired for today even if the plan pairs it;
   * a number = paired with that plan_exercise for today. */
  supersetPartner?: number | null
}

export type ExerciseOverrideMap = Record<number, ExerciseOverride>

export function effectiveExerciseId(pe: PlanExerciseDetail, overrides: ExerciseOverrideMap): number {
  return overrides[pe.id]?.substitutedExercise ?? pe.exercise
}

/** Resolves the plan_exercise id this exercise is superset-paired with right
 * now, falling back to the plan's own default when there's no override. */
export function effectiveSupersetPartner(
  peId: number,
  exercisesById: Map<number, PlanExerciseDetail>,
  overrides: ExerciseOverrideMap,
): number | null {
  const override = overrides[peId]?.supersetPartner
  if (override !== undefined) return override
  return exercisesById.get(peId)?.superset_with ?? null
}

function ensureEntry(overrides: ExerciseOverrideMap, peId: number): ExerciseOverride {
  return overrides[peId] ?? { substitutedExercise: null }
}

export function withSubstitution(overrides: ExerciseOverrideMap, peId: number, exerciseId: number | null): ExerciseOverrideMap {
  return { ...overrides, [peId]: { ...ensureEntry(overrides, peId), substitutedExercise: exerciseId } }
}

/** Pairs two exercises for today's log, clearing either one's previous
 * partner first (mirrors the trainer-side pair semantics) - pairs only. */
export function withPairing(
  overrides: ExerciseOverrideMap,
  exercisesById: Map<number, PlanExerciseDetail>,
  aId: number,
  bId: number,
): ExerciseOverrideMap {
  let next = { ...overrides }
  const staleA = effectiveSupersetPartner(aId, exercisesById, next)
  const staleB = effectiveSupersetPartner(bId, exercisesById, next)
  for (const stale of [staleA, staleB]) {
    if (stale !== null && stale !== aId && stale !== bId) {
      next = { ...next, [stale]: { ...ensureEntry(next, stale), supersetPartner: null } }
    }
  }
  next = {
    ...next,
    [aId]: { ...ensureEntry(next, aId), supersetPartner: bId },
    [bId]: { ...ensureEntry(next, bId), supersetPartner: aId },
  }
  return next
}

export function withUnpair(overrides: ExerciseOverrideMap, exercisesById: Map<number, PlanExerciseDetail>, peId: number): ExerciseOverrideMap {
  const partner = effectiveSupersetPartner(peId, exercisesById, overrides)
  let next = { ...overrides, [peId]: { ...ensureEntry(overrides, peId), supersetPartner: null } }
  if (partner !== null) {
    next = { ...next, [partner]: { ...ensureEntry(next, partner), supersetPartner: null } }
  }
  return next
}
