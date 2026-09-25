import type { WeightUnit } from '@/api/types'
import type { DraftSet } from '@/pages/workout/ExerciseLogBlock'
import type { ExerciseOverrideMap } from './exerciseOverrides'

export type ExerciseDrafts = { warmup: DraftSet[]; working: DraftSet[] }

export type WorkoutDraft = {
  savedAt: number
  exerciseOrder: number[]
  drafts: Record<number, ExerciseDrafts>
  overrides: ExerciseOverrideMap
  weightUnit: WeightUnit
  notes: string
  durationMinutes: string
}

function draftKey(planSessionId: number, date: string): string {
  return `rejim:workout-draft:${planSessionId}:${date}`
}

function hasAnyEntry(sets: DraftSet[]): boolean {
  return sets.some(
    (s) =>
      s.weight.trim() !== '' ||
      s.reps_done.trim() !== '' ||
      s.rpe.trim() !== '' ||
      s.weight_left.trim() !== '' ||
      s.weight_right.trim() !== '' ||
      s.reps_done_left.trim() !== '' ||
      s.reps_done_right.trim() !== '' ||
      s.rpe_left.trim() !== '' ||
      s.rpe_right.trim() !== '',
  )
}

/** True when a draft has nothing in it worth restoring - no set anywhere has
 * any value entered, and notes/duration/overrides are all untouched too.
 * `saveWorkoutDraft` uses this to skip persisting a session that's still
 * exactly in its freshly-opened, untouched state - the blank defaults
 * `SessionLogForm` seeds a brand-new session with otherwise look,
 * content-wise, exactly like "the trainee has unsaved changes here". */
function isEmpty(draft: Omit<WorkoutDraft, 'savedAt'>): boolean {
  const hasSetData = Object.values(draft.drafts).some((d) => hasAnyEntry(d.warmup) || hasAnyEntry(d.working))
  return (
    !hasSetData &&
    draft.notes.trim() === '' &&
    draft.durationMinutes.trim() === '' &&
    Object.keys(draft.overrides).length === 0
  )
}

/** In-progress session logging that hasn't been saved to the backend yet,
 * mirrored into localStorage as the trainee fills it in - a workout log can
 * easily take an hour or more, and until now nothing survived the app being
 * closed, backgrounded and reclaimed by iOS, or the phone dying mid-session
 * (SessionLogForm only ever talks to the backend once, on "Save log" -
 * everything up to that point lived in React state alone). Keyed by
 * (plan_session, date), the same identity WorkoutSession itself upserts on,
 * so it naturally matches whichever session+date SessionLogForm is currently
 * showing. Cleared once that session is actually saved or its saved log is
 * removed - see SessionLogForm's handleSave/handleClear. */
export function loadWorkoutDraft(planSessionId: number, date: string): WorkoutDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(planSessionId, date))
    return raw ? (JSON.parse(raw) as WorkoutDraft) : null
  } catch {
    return null
  }
}

export function saveWorkoutDraft(planSessionId: number, date: string, draft: Omit<WorkoutDraft, 'savedAt'>): void {
  // A no-op, not a clear: an empty candidate here is just as likely to be a
  // stale/transitional render (e.g. React re-running an effect before a
  // just-restored draft has actually landed in state) as it is a trainee
  // who genuinely backspaced everything back out - and wiping a real,
  // already-restored draft because of the former would be worse than
  // leaving a harmless stale empty one around because of the latter.
  if (isEmpty(draft)) return
  try {
    localStorage.setItem(draftKey(planSessionId, date), JSON.stringify({ ...draft, savedAt: Date.now() }))
  } catch {
    // Storage full/unavailable (private browsing, quota) - logging still
    // works normally in-memory for this session, it just won't survive the
    // app being killed.
  }
}

export function clearWorkoutDraft(planSessionId: number, date: string): void {
  try {
    localStorage.removeItem(draftKey(planSessionId, date))
  } catch {
    // ignore - nothing to clean up if storage was never writable
  }
}
