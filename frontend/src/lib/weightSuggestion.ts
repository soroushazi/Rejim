import type { ExerciseHistorySet, WeightUnit } from '@/api/types'
import { fromKg, toKg } from './weightUnits'

export type WeightSuggestion =
  | { status: 'first' }
  | { status: 'low' | 'good' | 'high'; anchorWeight: number; lastWeightUnit: WeightUnit; avgReps: number }
  | { status: 'mixed'; lowWeight: number; highWeight: number; suggestedWeight: number; lastWeightUnit: WeightUnit }

function roundUpToFive(value: number): number {
  return Math.ceil(value / 5) * 5
}

/** First time doing this exercise: no suggestion. Otherwise, looks at the
 * most recent prior session's sets against the plan's own target rep range
 * (not a fixed 8-12) - per spec, warm-up and drop sets are excluded so they
 * don't skew it.
 *
 * A session's sets aren't always all the same weight (e.g. set 1 felt too
 * light, so sets 2-3 went heavier) - so rather than one plain average, this
 * anchors on the lightest and heaviest weights actually tried:
 *   1. Lightest weight's reps below the range -> even the lightest was too
 *      much - suggest going lower than that.
 *   2. Heaviest weight's reps above the range -> even the heaviest was too
 *      easy - suggest going higher than that.
 *   3. Heaviest weight's reps within the range -> that weight is the right
 *      one to repeat - keep it.
 *   4. Otherwise (lightest was fine, heaviest wasn't enough) - the right
 *      weight is somewhere in between. Suggests a reps-weighted average
 *      across every set in the session (heavier sets with more reps pull it
 *      up more), rounded up to the nearest 5, framed as a range to choose
 *      within rather than a single number.
 * A session logged at a single weight throughout collapses to cases 1-3,
 * matching the plain single-weight behavior this replaces. */
export function suggestWeight(history: ExerciseHistorySet[], targetRepsMin: number, targetRepsMax: number): WeightSuggestion {
  // A per-side (Exercise.is_unilateral) exercise's history has a null
  // `weight`/`reps_done` - not yet supported here, so those rows are
  // excluded rather than coerced into a misleading average of 0.
  const working = history.filter(
    (s): s is ExerciseHistorySet & { weight: string; reps_done: number } =>
      !s.is_warmup && !s.is_dropset && s.weight !== null && s.reps_done !== null,
  )
  if (working.length === 0) return { status: 'first' }

  const mostRecentDate = working.reduce(
    (max, s) => (s.session_date > max ? s.session_date : max),
    working[0].session_date,
  )
  const lastSession = working.filter((s) => s.session_date === mostRecentDate)
  const unit = lastSession[lastSession.length - 1].weight_unit

  const weights = lastSession.map((s) => Number(s.weight))
  const lightestWeight = Math.min(...weights)
  const heaviestWeight = Math.max(...weights)
  const avgRepsAt = (weight: number) => {
    const atWeight = lastSession.filter((s) => Number(s.weight) === weight)
    return atWeight.reduce((sum, s) => sum + s.reps_done, 0) / atWeight.length
  }
  const repsAtLightest = avgRepsAt(lightestWeight)
  const repsAtHeaviest = avgRepsAt(heaviestWeight)

  if (repsAtLightest < targetRepsMin) {
    return { status: 'low', anchorWeight: lightestWeight, lastWeightUnit: unit, avgReps: Math.round(repsAtLightest * 10) / 10 }
  }
  if (repsAtHeaviest > targetRepsMax) {
    return { status: 'high', anchorWeight: heaviestWeight, lastWeightUnit: unit, avgReps: Math.round(repsAtHeaviest * 10) / 10 }
  }
  if (repsAtHeaviest >= targetRepsMin) {
    return { status: 'good', anchorWeight: heaviestWeight, lastWeightUnit: unit, avgReps: Math.round(repsAtHeaviest * 10) / 10 }
  }

  const totalReps = lastSession.reduce((sum, s) => sum + s.reps_done, 0)
  const weightedSum = lastSession.reduce((sum, s) => sum + Number(s.weight) * s.reps_done, 0)
  return {
    status: 'mixed',
    lowWeight: lightestWeight,
    highWeight: heaviestWeight,
    suggestedWeight: roundUpToFive(weightedSum / totalReps),
    lastWeightUnit: unit,
  }
}

export type UnilateralWeightSuggestion =
  | { status: 'first' }
  | { status: 'low' | 'good' | 'high'; anchorWeight: number; lastWeightUnit: WeightUnit; avgRepsLeft: number; avgRepsRight: number }
  | {
      status: 'catchup'
      strongerSide: 'left' | 'right'
      avgRepsLeft: number
      avgRepsRight: number
      anchorWeight: number
      lastWeightUnit: WeightUnit
    }

/** Per-side (Exercise.is_unilateral) counterpart of suggestWeight. Trainees
 * almost always pick the same weight for both sides (it's rare to
 * deliberately go lighter on one arm/leg), so unlike suggestWeight this
 * never suggests different weights per side or averages reps across sides -
 * per spec, a strength imbalance is a reps problem, not a weight one: the
 * weaker side needs more reps at the same weight to catch up, not a lighter
 * weight to make it easier.
 *
 * Classifies each side's average reps (from the most recent session)
 * against the target range independently:
 *   - Both sides above the range -> too easy for both - suggest raising.
 *   - Both sides within the range -> keep the weight.
 *   - Both sides below the range -> too much for both - suggest lowering.
 *   - Otherwise (sides disagree) -> 'catchup': keep the weight, but push
 *     extra reps on whichever side already does more, rather than holding
 *     it back to match the weaker side. */
export function suggestUnilateralWeight(
  history: ExerciseHistorySet[],
  targetRepsMin: number,
  targetRepsMax: number,
): UnilateralWeightSuggestion {
  const working = history.filter(
    (
      s,
    ): s is ExerciseHistorySet & {
      weight_left: string
      weight_right: string
      reps_done_left: number
      reps_done_right: number
    } => !s.is_warmup && !s.is_dropset && s.weight_left !== null && s.weight_right !== null && s.reps_done_left !== null && s.reps_done_right !== null,
  )
  if (working.length === 0) return { status: 'first' }

  const mostRecentDate = working.reduce(
    (max, s) => (s.session_date > max ? s.session_date : max),
    working[0].session_date,
  )
  const lastSession = working.filter((s) => s.session_date === mostRecentDate)
  const last = lastSession[lastSession.length - 1]
  const unit = last.weight_unit
  // Shown for context only, not decided on - see the doc comment above.
  const anchorWeight = (Number(last.weight_left) + Number(last.weight_right)) / 2

  const avgRepsLeft = lastSession.reduce((sum, s) => sum + s.reps_done_left, 0) / lastSession.length
  const avgRepsRight = lastSession.reduce((sum, s) => sum + s.reps_done_right, 0) / lastSession.length
  const round1 = (n: number) => Math.round(n * 10) / 10

  const classify = (avg: number) => (avg < targetRepsMin ? 'low' : avg > targetRepsMax ? 'high' : 'good')
  const leftStatus = classify(avgRepsLeft)
  const rightStatus = classify(avgRepsRight)

  if (leftStatus === rightStatus) {
    return {
      status: leftStatus,
      anchorWeight,
      lastWeightUnit: unit,
      avgRepsLeft: round1(avgRepsLeft),
      avgRepsRight: round1(avgRepsRight),
    }
  }

  return {
    status: 'catchup',
    strongerSide: avgRepsLeft >= avgRepsRight ? 'left' : 'right',
    avgRepsLeft: round1(avgRepsLeft),
    avgRepsRight: round1(avgRepsRight),
    anchorWeight,
    lastWeightUnit: unit,
  }
}

export type WeightDirectionFeedback = { tone: 'good' | 'bad'; note: string }

/** Live feedback on the weight the trainee is *actually* entering for a
 * working set, vs. the suggested direction: staying at/above the anchor
 * weight when the suggestion says to lower it is flagged bad (and the
 * reverse), so the color reflects whether they're following the advice, not
 * just which direction the advice points. Only meaningful when there's a
 * directional suggestion (low/high) and a comparable weight already typed -
 * a 'mixed' suggestion is deliberately ambiguous about direction, so it gets
 * no live feedback either, same as 'good'/'first'. */
export function weightDirectionFeedback(
  suggestion: WeightSuggestion,
  enteredWeight: number,
): WeightDirectionFeedback | null {
  if (suggestion.status !== 'low' && suggestion.status !== 'high') return null
  if (!Number.isFinite(enteredWeight)) return null
  // Already at bodyweight (no added weight) - there's nothing lighter to go
  // to, so there's no "consider dropping the weight" to nag about.
  if (suggestion.status === 'low' && suggestion.anchorWeight <= 0) return null

  const unit = suggestion.lastWeightUnit
  if (suggestion.status === 'low') {
    return enteredWeight < suggestion.anchorWeight
      ? { tone: 'good', note: 'Lowering the weight — that’s what’s suggested.' }
      : {
          tone: 'bad',
          note: `Not lower than last time (${formatWeight(suggestion.anchorWeight, unit)}) — consider dropping the weight.`,
        }
  }

  return enteredWeight > suggestion.anchorWeight
    ? { tone: 'good', note: 'Pushing heavier — that’s what’s suggested.' }
    : {
        tone: 'bad',
        note: `Not heavier than last time (${formatWeight(suggestion.anchorWeight, unit)}) — consider adding weight.`,
      }
}

/** How much a "lower"/"raise" suggestion moves the first set's weight. */
const WEIGHT_STEP_CHANGE = 10

/** Plate-friendly rounding: nearest 5 lb, or nearest 2.5 kg (the kg
 * equivalent - rounding kg to 5 would be a ~11 lb jump). */
export function roundToPlate(value: number, unit: WeightUnit): number {
  const step = unit === 'lb' ? 5 : 2.5
  return Math.round(value / step) * step
}

/** A last-session weight, expressed in the unit being logged now - unchanged
 * when the units already match, converted + plate-rounded when they don't. */
function inUnit(value: number, from: WeightUnit, to: WeightUnit): number {
  return from === to ? value : roundToPlate(fromKg(toKg(value, from), to), to)
}

/** The weight to suggest (as a placeholder) for the first working set, in the
 * unit being logged now: last time's weight when its reps landed in range,
 * 10 lower/higher when they fell under/over it, and the in-between weight for
 * a 'mixed' session. A per-side 'catchup' keeps the weight (see
 * suggestUnilateralWeight). Null the first time an exercise is done. */
export function suggestedWorkingWeight(
  suggestion: WeightSuggestion | UnilateralWeightSuggestion,
  unit: WeightUnit,
): number | null {
  switch (suggestion.status) {
    case 'first':
      return null
    case 'mixed':
      return inUnit(suggestion.suggestedWeight, suggestion.lastWeightUnit, unit)
    case 'low':
      return Math.max(0, inUnit(suggestion.anchorWeight, suggestion.lastWeightUnit, unit) - WEIGHT_STEP_CHANGE)
    case 'high':
      return inUnit(suggestion.anchorWeight, suggestion.lastWeightUnit, unit) + WEIGHT_STEP_CHANGE
    default:
      return inUnit(suggestion.anchorWeight, suggestion.lastWeightUnit, unit)
  }
}

/** Warm-up placeholder: a third of the suggested working weight, plate-rounded.
 * Null when there's nothing sensible to suggest (no working suggestion, or it
 * rounds down to nothing). */
export function suggestedWarmupWeight(workingWeight: number | null, unit: WeightUnit): number | null {
  if (workingWeight === null) return null
  const weight = roundToPlate(workingWeight / 3, unit)
  return weight > 0 ? weight : null
}

/** Drop-set placeholder: half the weight of this session's last working set,
 * plate-rounded. */
export function suggestedDropsetWeight(lastWorkingWeight: string, unit: WeightUnit): number | null {
  const value = Number(lastWorkingWeight)
  if (lastWorkingWeight.trim() === '' || !Number.isFinite(value) || value <= 0) return null
  const weight = roundToPlate(value / 2, unit)
  return weight > 0 ? weight : null
}

export type SuggestionHint = { tone: 'neutral' | 'lower' | 'raise' | 'mixed'; text: string }

/** A logged weight of 0 means no added weight - bodyweight (a pull-up, a
 * push-up) - so it reads as that rather than "0lb". */
function formatWeight(weight: number, unit: string, zeroLabel = 'bodyweight'): string {
  return weight <= 0 ? zeroLabel : `${weight}${unit}`
}

/** The "why" shown under the first working set, next to its placeholder - so
 * the trainee sees the suggestion *before* lifting, not only once they've
 * already done a set at the wrong weight. */
export function suggestionHint(
  suggestion: WeightSuggestion | UnilateralWeightSuggestion,
  suggestedWeight: number | null,
  unit: WeightUnit,
  targetRepsMin: number,
  targetRepsMax: number,
): SuggestionHint | null {
  if (suggestion.status === 'first' || suggestedWeight === null) return null
  const range = `${targetRepsMin}–${targetRepsMax}`
  const suggested = formatWeight(suggestedWeight, unit, 'bodyweight (no added weight)')
  if (suggestion.status === 'mixed') {
    return {
      tone: 'mixed',
      text: `Last time you used different weights (${suggestion.lowWeight}–${suggestion.highWeight}${suggestion.lastWeightUnit}). Somewhere in between should land in your ${range} rep range — suggested: ${suggested}.`,
    }
  }
  const at = formatWeight(suggestion.anchorWeight, suggestion.lastWeightUnit)
  const reps =
    'avgReps' in suggestion
      ? `${suggestion.avgReps} reps per set`
      : `~${suggestion.avgRepsLeft} (L) / ~${suggestion.avgRepsRight} (R) reps per set`
  switch (suggestion.status) {
    case 'low':
      // Weights can't go negative: at bodyweight already, the only way into
      // the range is more reps over time, not a lighter load.
      if (suggestion.anchorWeight <= 0) {
        return {
          tone: 'neutral',
          text: `Last time you averaged ${reps} at bodyweight — under your ${range} range. You can't go lighter than bodyweight, so keep it and work toward more reps.`,
        }
      }
      return { tone: 'lower', text: `Last time you averaged ${reps} at ${at} — under your ${range} range, so go lighter: ${suggested}.` }
    case 'high':
      if (suggestion.anchorWeight <= 0) {
        return { tone: 'raise', text: `Last time you averaged ${reps} at bodyweight — over your ${range} range, so add weight: ${suggested}.` }
      }
      return { tone: 'raise', text: `Last time you averaged ${reps} at ${at} — over your ${range} range, so go heavier: ${suggested}.` }
    case 'catchup':
      return {
        tone: 'mixed',
        text: `Last time you did ${reps} at ${at} — keep ${suggested}, but push extra reps on your ${suggestion.strongerSide} side until the other catches up.`,
      }
    default:
      return { tone: 'neutral', text: `Last time you averaged ${reps} at ${at} — right in your ${range} range, so keep it: ${suggested}.` }
  }
}
