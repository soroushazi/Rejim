import type { LoggedExerciseEntry, WorkoutSessionLog } from '@/api/types'
import { averagedWeightReps } from './setMeasure'

export type PlanExerciseInfo = { exerciseId: number; exerciseName: string }

export type ExerciseMover = {
  exerciseId: number
  exerciseName: string
  firstScore: number
  lastScore: number
  percentChange: number
}

/** One session's strength score for an exercise: max working weight x average
 * working reps/set - the same "simple strength score" the spec asks for.
 * Warm-up and drop sets are excluded, same convention as weight suggestions/PRs
 * and the exercise-history chart. */
function sessionScore(logged: LoggedExerciseEntry): number | null {
  // A per-side (Exercise.is_unilateral) set counts as the average of its
  // two sides (lib/setMeasure.ts).
  const working = logged.sets
    .filter((s) => !s.is_warmup && !s.is_dropset)
    .map(averagedWeightReps)
    .filter((m) => m !== null)
  if (working.length === 0) return null
  const maxWeight = Math.max(...working.map((s) => s.weight))
  const avgReps = working.reduce((sum, s) => sum + s.reps, 0) / working.length
  return maxWeight * avgReps
}

/** Ranks every exercise the trainee has logged at least twice by how its
 * strength score changed from the first to the most recent logged session -
 * the simplest reading of "trended over time" for a per-exercise score. */
export function computeTopMovers(
  sessions: WorkoutSessionLog[],
  planExerciseInfo: Map<number, PlanExerciseInfo>,
): { improving: ExerciseMover[]; declining: ExerciseMover[] } {
  const pointsByExercise = new Map<number, { date: string; score: number }[]>()
  const namesById = new Map<number, string>()

  for (const session of sessions) {
    for (const logged of session.logged_exercises) {
      // A logged exercise whose plan_exercise has since been deleted (e.g.
      // the trainer swapped it out) can't be attributed to a current plan
      // slot at all - excluded here, same as any other "not found" case.
      if (logged.plan_exercise === null) continue
      const info = planExerciseInfo.get(logged.plan_exercise)
      if (!info) continue
      const score = sessionScore(logged)
      if (score === null) continue
      namesById.set(info.exerciseId, info.exerciseName)
      const points = pointsByExercise.get(info.exerciseId) ?? []
      points.push({ date: session.date, score })
      pointsByExercise.set(info.exerciseId, points)
    }
  }

  const movers: ExerciseMover[] = []
  for (const [exerciseId, points] of pointsByExercise) {
    const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
    if (sorted.length < 2) continue
    const first = sorted[0].score
    const last = sorted[sorted.length - 1].score
    if (first <= 0) continue
    movers.push({
      exerciseId,
      exerciseName: namesById.get(exerciseId) ?? '',
      firstScore: first,
      lastScore: last,
      percentChange: ((last - first) / first) * 100,
    })
  }

  const improving = [...movers]
    .filter((m) => m.percentChange > 0)
    .sort((a, b) => b.percentChange - a.percentChange)
    .slice(0, 3)
  const declining = [...movers]
    .filter((m) => m.percentChange < 0)
    .sort((a, b) => a.percentChange - b.percentChange)
    .slice(0, 3)

  return { improving, declining }
}
