type Value = string | number | null | undefined

type SetValues = {
  weight: Value
  reps_done: Value
  weight_left?: Value
  weight_right?: Value
  reps_done_left?: Value
  reps_done_right?: Value
}

function toNumber(v: Value): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** One set's weight and reps for strength math (exercise-history chart, PRs,
 * Top movers): a normal set's own values, or - for a per-side
 * (Exercise.is_unilateral) set - the average of its left and right sides.
 * null when the set doesn't have a complete pair either way. Works on both
 * saved sets and in-progress draft sets (strings, '' = not entered).
 * Mirrored server-side by progress/services.py::averaged_weight_reps. */
export function averagedWeightReps(s: SetValues): { weight: number; reps: number } | null {
  const weight = toNumber(s.weight)
  const reps = toNumber(s.reps_done)
  if (weight !== null && reps !== null) return { weight, reps }

  const weightLeft = toNumber(s.weight_left)
  const weightRight = toNumber(s.weight_right)
  const repsLeft = toNumber(s.reps_done_left)
  const repsRight = toNumber(s.reps_done_right)
  if (weightLeft === null || weightRight === null || repsLeft === null || repsRight === null) return null
  return { weight: (weightLeft + weightRight) / 2, reps: (repsLeft + repsRight) / 2 }
}
