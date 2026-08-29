import type { ExerciseHistorySet, WeightUnit } from '@/api/types'

export type WeightSuggestion =
  | { status: 'first' }
  | { status: 'low' | 'good' | 'high'; lastWeight: number; lastWeightUnit: WeightUnit; avgReps: number }

/** First time doing this exercise: no suggestion. Otherwise, compares the
 * average reps/set from the most recent prior session against the plan's own
 * target rep range (not a fixed 8-12) and suggests lowering/keeping/raising
 * the weight - per spec, warm-up sets are excluded so they don't skew the
 * average. */
export function suggestWeight(history: ExerciseHistorySet[], targetRepsMin: number, targetRepsMax: number): WeightSuggestion {
  const working = history.filter((s) => !s.is_warmup)
  if (working.length === 0) return { status: 'first' }

  const mostRecentDate = working.reduce(
    (max, s) => (s.session_date > max ? s.session_date : max),
    working[0].session_date,
  )
  const lastSession = working.filter((s) => s.session_date === mostRecentDate)
  const avgReps = lastSession.reduce((sum, s) => sum + s.reps_done, 0) / lastSession.length
  const last = lastSession[lastSession.length - 1]

  const status = avgReps < targetRepsMin ? 'low' : avgReps > targetRepsMax ? 'high' : 'good'
  return {
    status,
    lastWeight: Number(last.weight),
    lastWeightUnit: last.weight_unit,
    avgReps: Math.round(avgReps * 10) / 10,
  }
}

export type WeightDirectionFeedback = { tone: 'good' | 'bad'; note: string }

/** Live feedback on the weight the trainee is *actually* entering for a
 * working set, vs. the suggested direction: staying at/above last time's
 * weight when the suggestion says to lower it is flagged bad (and the
 * reverse), so the color reflects whether they're following the advice, not
 * just which direction the advice points. Only meaningful when there's a
 * directional suggestion (low/high) and a comparable weight already typed. */
export function weightDirectionFeedback(
  suggestion: WeightSuggestion,
  enteredWeight: number,
): WeightDirectionFeedback | null {
  if (suggestion.status !== 'low' && suggestion.status !== 'high') return null
  if (!Number.isFinite(enteredWeight)) return null

  const unit = suggestion.lastWeightUnit
  if (suggestion.status === 'low') {
    return enteredWeight < suggestion.lastWeight
      ? { tone: 'good', note: 'Lowering the weight — that’s what’s suggested.' }
      : {
          tone: 'bad',
          note: `Not lower than last time (${suggestion.lastWeight}${unit}) — consider dropping the weight.`,
        }
  }

  return enteredWeight > suggestion.lastWeight
    ? { tone: 'good', note: 'Pushing heavier — that’s what’s suggested.' }
    : {
        tone: 'bad',
        note: `Not heavier than last time (${suggestion.lastWeight}${unit}) — consider adding weight.`,
      }
}
