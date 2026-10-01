import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { listExercises, listMuscleGroups } from '@/api/exercises'
import { deleteWorkoutSession, saveWorkoutSession } from '@/api/workoutSessions'
import type {
  Exercise,
  MuscleGroup,
  NewLoggedSet,
  NewWorkoutSessionLog,
  PlanExerciseDetail,
  PlanSessionDetail,
  WeightUnit,
  WorkoutSessionLog,
} from '@/api/types'
import CollapsibleSection from '@/components/CollapsibleSection'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toDateKey } from '@/lib/date'
import {
  effectiveExerciseId,
  effectiveSupersetPartner,
  type ExerciseOverrideMap,
} from '@/lib/exerciseOverrides'
import { cn } from '@/lib/utils'
import { formatElapsed, minutesFromMs, timerElapsedMs } from '@/lib/elapsed'
import { usePreferredWeightUnit } from '@/lib/usePreferredWeightUnit'
import { clearWorkoutDraft, loadWorkoutDraft, saveWorkoutDraft, type ExerciseDrafts } from '@/lib/workoutDraft'
import ExerciseLogBlock, { type DraftSet } from './ExerciseLogBlock'
import ExerciseInfoButton from './ExerciseInfoButton'
import ExerciseLogListRow from './ExerciseLogListRow'
import OffProgramDialog from './OffProgramDialog'
import { newDraftSet } from './SetRows'
import SupersetLogBlock, { type ExerciseLogEntry } from './SupersetLogBlock'
import SupersetLogListRow from './SupersetLogListRow'

type LogBlock = { type: 'single'; peId: number } | { type: 'pair'; peId: number; partnerId: number }

/** Groups a flat exercise order into single/pair render blocks. A superset
 * pair is always rendered adjacently (at the earlier member's slot) even if
 * `order` doesn't happen to have them next to each other - reordering (see
 * moveBlock below) then keeps them contiguous going forward. Pairing here is
 * the *effective* pairing (plan default, overridden per-log via the
 * Off-program dialog - see effectiveSupersetPartner), not necessarily what
 * the plan itself defines. */
function buildBlocks(order: number[], exercisesById: Map<number, PlanExerciseDetail>, overrides: ExerciseOverrideMap): LogBlock[] {
  const seen = new Set<number>()
  const blocks: LogBlock[] = []
  for (const peId of order) {
    if (seen.has(peId)) continue
    const partnerId = effectiveSupersetPartner(peId, exercisesById, overrides)
    if (partnerId !== null && exercisesById.has(partnerId) && order.includes(partnerId) && !seen.has(partnerId)) {
      blocks.push({ type: 'pair', peId, partnerId })
      seen.add(peId)
      seen.add(partnerId)
    } else {
      blocks.push({ type: 'single', peId })
      seen.add(peId)
    }
  }
  return blocks
}

/** How many rounds (one working set of each exercise) are fully confirmed on
 * both sides - mirrors SupersetLogBlock's own round-pairing logic, needed
 * here too for the list row's "x/y rounds" summary. */
function countConfirmedRounds(a: ExerciseLogEntry, b: ExerciseLogEntry) {
  const roundCount = Math.max(a.workingSets.length, b.workingSets.length, 1)
  let confirmed = 0
  for (let i = 0; i < roundCount; i++) {
    if ((a.workingSets[i]?.confirmed ?? false) && (b.workingSets[i]?.confirmed ?? false)) confirmed++
  }
  return confirmed
}

type Props = {
  sessions: PlanSessionDetail[]
  selectedSessionId: number
  onSelectSession: (id: number) => void
  date: string
  onDateChange: (date: string) => void
  existingLog: WorkoutSessionLog | null
  onSaved: (log: WorkoutSessionLog) => void
  onDeleted: () => void
  /** Rendered under the Save/Remove buttons - WorkoutLogPage's "Back to
   * today's workout" when the day already has a log. */
  footer?: ReactNode
  /** True until the trainee has ever saved a single WorkoutSession - gates
   * the Weight unit banner below, which only needs to be seen once. */
  isFirstLog: boolean
}

function draftSetsToPayload(
  sets: DraftSet[],
  weightUnit: WeightUnit,
  startNumber: number,
  isUnilateral: boolean,
): NewLoggedSet[] {
  if (isUnilateral) {
    return sets
      .filter(
        (s) =>
          s.weight_left.trim() !== '' &&
          s.weight_right.trim() !== '' &&
          s.reps_done_left.trim() !== '' &&
          s.reps_done_right.trim() !== '',
      )
      .map((s, i) => ({
        set_number: startNumber + i,
        weight_unit: weightUnit,
        weight_left: s.weight_left,
        weight_right: s.weight_right,
        reps_done_left: Number(s.reps_done_left),
        reps_done_right: Number(s.reps_done_right),
        is_warmup: s.is_warmup,
        is_dropset: s.is_dropset,
        rpe_left: s.rpe_left.trim() ? Number(s.rpe_left) : null,
        rpe_right: s.rpe_right.trim() ? Number(s.rpe_right) : null,
      }))
  }
  return sets
    .filter((s) => s.weight.trim() !== '' && s.reps_done.trim() !== '')
    .map((s, i) => ({
      set_number: startNumber + i,
      weight: s.weight,
      weight_unit: weightUnit,
      reps_done: Number(s.reps_done),
      is_warmup: s.is_warmup,
      is_dropset: s.is_dropset,
      rpe: s.rpe.trim() ? Number(s.rpe) : null,
    }))
}

export default function SessionLogForm({
  sessions,
  selectedSessionId,
  onSelectSession,
  date,
  onDateChange,
  existingLog,
  onSaved,
  onDeleted,
  footer,
  isFirstLog,
}: Props) {
  const session = sessions.find((s) => s.id === selectedSessionId) ?? sessions[0]
  const preferredUnit = usePreferredWeightUnit()
  const [exerciseOrder, setExerciseOrder] = useState<number[]>([])
  const [drafts, setDrafts] = useState<Record<number, ExerciseDrafts>>({})
  // Which block (by its first plan_exercise id) is currently open in the
  // full-screen logging view - null shows the session overview list instead.
  // Only one at a time, for the same reason reordering only ever shows one
  // thing at once: no risk of "the block I tapped" shifting under a finger.
  const [focusedPeId, setFocusedPeId] = useState<number | null>(null)
  const [reordering, setReordering] = useState(false)
  const [modifyOpen, setModifyOpen] = useState(false)
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lb')
  const [notes, setNotes] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [caloriesBurned, setCaloriesBurned] = useState('')
  // Epoch ms, or null when the timer isn't running - see lib/workoutDraft.ts
  // for why this is persisted rather than just tracked in a setInterval.
  // Three states: idle (null + 0), running (non-null), paused (null + >0).
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null)
  const [timerAccumulatedMs, setTimerAccumulatedMs] = useState(0)
  const [clearTimerOpen, setClearTimerOpen] = useState(false)
  const [removeLogOpen, setRemoveLogOpen] = useState(false)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  const [overrides, setOverrides] = useState<ExerciseOverrideMap>({})
  const [offProgramOpen, setOffProgramOpen] = useState(false)
  const [restoredFromDraft, setRestoredFromDraft] = useState(false)
  // Bumped by the restoration effect below every time it (re)populates
  // exerciseOrder/drafts/etc from a draft, an existing log, or blank - lets
  // the persistence effect recognize "this render's data is still exactly
  // what was just mechanically restored, not a fresh edit" and skip writing
  // it back out. State (not a ref) specifically because React batches this
  // together with the other setState calls in that same effect run, so it
  // always lands in the very same render as the data it's meant to gate -
  // unlike a plain one-shot ref flag, which a mount's extra, mandatory first
  // effect pass (before that batched data has actually landed) would
  // consume one render too early. See the persistence effect for the other
  // half of this.
  const [restoreGeneration, setRestoreGeneration] = useState(0)
  const skippedGenerationRef = useRef(-1)

  useEffect(() => {
    listExercises().then(setExercises).catch(() => setExercises([]))
    listMuscleGroups().then(setMuscleGroups).catch(() => setMuscleGroups([]))
  }, [])

  // Ticks once a second while the timer's running, purely to keep the live
  // "elapsed" readout below moving - the persisted value is just
  // timerStartedAt itself (a timestamp), not a running counter, so this
  // interval is free to be recreated on every mount/reload without losing
  // anything.
  useEffect(() => {
    if (timerStartedAt === null) return
    const interval = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [timerStartedAt])

  // Keeps durationMinutes in sync with the running timer, so it's already
  // correct by the time of a manual edit, Stop, or Save - each of which
  // stops the timer from that point on (see their own handlers below).
  useEffect(() => {
    if (timerStartedAt === null) return
    const minutes = String(minutesFromMs(timerElapsedMs(timerAccumulatedMs, timerStartedAt, nowTick)))
    setDurationMinutes((prev) => (prev === minutes ? prev : minutes))
  }, [timerStartedAt, timerAccumulatedMs, nowTick])

  const exerciseBankById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  useEffect(() => {
    if (!session) return
    setSaved(false)
    setError(null)
    setReordering(false)
    setFocusedPeId(null)

    let nextOrder: number[]
    let nextDrafts: Record<number, ExerciseDrafts>
    let nextOverrides: ExerciseOverrideMap
    let nextWeightUnit: WeightUnit
    let nextNotes: string
    let nextDurationMinutes: string
    let nextCaloriesBurned: string
    let nextTimerStartedAt: number | null
    let nextTimerAccumulatedMs = 0

    // A local draft (unsaved edits from before the app was closed/killed)
    // always wins over both a blank form and an already-saved log - it only
    // ever exists because the trainee was actively editing this exact
    // session+date more recently than whatever's on the server, including
    // the case of re-opening an already-saved log to tweak it further. It's
    // cleared as soon as a save actually succeeds (see handleSave), so under
    // normal use the two never disagree.
    const draft = loadWorkoutDraft(session.id, date)
    if (draft) {
      nextOrder = [...draft.exerciseOrder]
      nextDrafts = { ...draft.drafts }
      for (const pe of session.exercises) {
        if (!nextOrder.includes(pe.id)) nextOrder.push(pe.id)
        // `dropset` defensively defaulted for a draft saved by an older
        // version of this page, before drop sets existed.
        const existing = nextDrafts[pe.id]
        nextDrafts[pe.id] = existing
          ? { warmup: existing.warmup, working: existing.working, dropset: existing.dropset ?? [] }
          : { warmup: [], working: [newDraftSet(false)], dropset: [] }
      }
      nextOverrides = draft.overrides
      nextWeightUnit = draft.weightUnit
      nextNotes = draft.notes
      nextDurationMinutes = draft.durationMinutes
      nextCaloriesBurned = draft.caloriesBurned ?? ''
      nextTimerStartedAt = draft.timerStartedAt ?? null
      nextTimerAccumulatedMs = draft.timerAccumulatedMs ?? 0
      setRestoredFromDraft(true)
    } else {
      setRestoredFromDraft(false)
      if (existingLog) {
        // A logged exercise whose plan_exercise has since been deleted (e.g.
        // the trainer swapped it out) can't be represented in this
        // live-plan-driven editing UI - it's excluded here, and the backend
        // separately knows to leave it untouched on save rather than wiping
        // it as "no longer submitted" (see WorkoutSessionSerializer._upsert).
        // It's still fully visible in Session History either way.
        const editableLoggedExercises = existingLog.logged_exercises.filter(
          (le): le is typeof le & { plan_exercise: number } => le.plan_exercise !== null,
        )
        const byPlanExercise = new Map(editableLoggedExercises.map((le) => [le.plan_exercise, le]))
        nextDrafts = {}
        nextWeightUnit = preferredUnit
        nextOrder = [...editableLoggedExercises].sort((a, b) => a.order - b.order).map((le) => le.plan_exercise)
        for (const pe of session.exercises) {
          if (!nextOrder.includes(pe.id)) nextOrder.push(pe.id)
          const logged = byPlanExercise.get(pe.id)
          if (logged && logged.sets.length > 0) {
            nextWeightUnit = logged.sets[0].weight_unit
            const toDraft = (s: (typeof logged.sets)[number]): DraftSet => ({
              ...newDraftSet(s.is_warmup, s.is_dropset),
              weight: s.weight ?? '',
              reps_done: s.reps_done !== null ? String(s.reps_done) : '',
              rpe: s.rpe !== null ? String(s.rpe) : '',
              weight_left: s.weight_left ?? '',
              weight_right: s.weight_right ?? '',
              reps_done_left: s.reps_done_left !== null ? String(s.reps_done_left) : '',
              reps_done_right: s.reps_done_right !== null ? String(s.reps_done_right) : '',
              rpe_left: s.rpe_left !== null ? String(s.rpe_left) : '',
              rpe_right: s.rpe_right !== null ? String(s.rpe_right) : '',
              confirmed: true,
            })
            nextDrafts[pe.id] = {
              warmup: logged.sets.filter((s) => s.is_warmup).map(toDraft),
              working: logged.sets.filter((s) => !s.is_warmup && !s.is_dropset).map(toDraft),
              dropset: logged.sets.filter((s) => s.is_dropset).map(toDraft),
            }
          } else {
            nextDrafts[pe.id] = { warmup: [], working: [newDraftSet(false)], dropset: [] }
          }
        }
        nextOverrides = {}
        for (const le of editableLoggedExercises) {
          if (le.substituted_exercise !== null || le.superset_partner !== null) {
            nextOverrides[le.plan_exercise] = { substitutedExercise: le.substituted_exercise, supersetPartner: le.superset_partner }
          }
        }
        nextNotes = existingLog.notes
        nextDurationMinutes = existingLog.duration_minutes !== null ? String(existingLog.duration_minutes) : ''
        nextCaloriesBurned = existingLog.calories_burned !== null ? String(existingLog.calories_burned) : ''
        nextTimerStartedAt = null
      } else {
        nextDrafts = {}
        for (const pe of session.exercises) {
          nextDrafts[pe.id] = { warmup: [], working: [newDraftSet(false)], dropset: [] }
        }
        nextOrder = session.exercises.map((pe) => pe.id)
        nextOverrides = {}
        nextWeightUnit = preferredUnit
        nextNotes = ''
        nextDurationMinutes = ''
        nextCaloriesBurned = ''
        nextTimerStartedAt = null
      }
    }

    setExerciseOrder(nextOrder)
    setDrafts(nextDrafts)
    setOverrides(nextOverrides)
    setWeightUnit(nextWeightUnit)
    setNotes(nextNotes)
    setDurationMinutes(nextDurationMinutes)
    setCaloriesBurned(nextCaloriesBurned)
    setTimerStartedAt(nextTimerStartedAt)
    setTimerAccumulatedMs(nextTimerAccumulatedMs)
    setNowTick(Date.now())
    setRestoreGeneration((g) => g + 1)
    // preferredUnit resolves asynchronously (starts at 'kg' until the
    // preferences fetch lands) - re-running once it settles is what makes a
    // brand-new day's weight unit default to the right one instead of
    // always 'kg', same pattern as DailyMetricForm's own weight field.
  }, [session, existingLog, date, preferredUnit])

  // Mirrors the in-progress session into localStorage on every change, so it
  // survives the app being closed/killed before "Save log" - see
  // lib/workoutDraft.ts. Skips writing once per restoreGeneration bump (see
  // that state's own comment) - i.e. the first time this effect sees a given
  // generation, that render's data is still exactly the mechanical
  // restore/reset the effect above just did, not a fresh edit, so it's
  // skipped; every run after that for the *same* generation is a genuine
  // change and gets persisted normally. Without this, the write here would
  // immediately recreate a draft that effect just intentionally left
  // untouched or, worse, one handleSave just cleared (saving successfully
  // feeds the new log back in as `existingLog`, which re-runs that same
  // restoration effect and would otherwise re-persist the very data that was
  // just safely saved - comparing the data's own content isn't reliable
  // here since the backend can echo it back reformatted, e.g. "135" ->
  // "135.00").
  useEffect(() => {
    if (!session) return
    if (skippedGenerationRef.current !== restoreGeneration) {
      skippedGenerationRef.current = restoreGeneration
      return
    }
    saveWorkoutDraft(session.id, date, {
      exerciseOrder,
      drafts,
      overrides,
      weightUnit,
      notes,
      durationMinutes,
      caloriesBurned,
      timerStartedAt,
      timerAccumulatedMs,
    })
  }, [
    session,
    date,
    restoreGeneration,
    exerciseOrder,
    drafts,
    overrides,
    weightUnit,
    notes,
    durationMinutes,
    caloriesBurned,
    timerStartedAt,
    timerAccumulatedMs,
  ])

  if (!session) {
    return <p className="text-sm text-muted-foreground">This plan has no sessions yet.</p>
  }

  const timerIdle = timerStartedAt === null && timerAccumulatedMs === 0
  const exercisesById = new Map(session.exercises.map((pe) => [pe.id, pe]))
  const blocks = buildBlocks(exerciseOrder, exercisesById, overrides)

  // Start and Resume are the same thing - a new run on top of whatever's
  // already accumulated (0 when starting fresh).
  function handleStartTimer() {
    setTimerStartedAt(Date.now())
  }

  // Folds the current run into the accumulated total and freezes
  // durationMinutes at it, so the field is exact while paused.
  function pauseTimer() {
    if (timerStartedAt === null) return
    const total = timerElapsedMs(timerAccumulatedMs, timerStartedAt, Date.now())
    setTimerAccumulatedMs(total)
    setTimerStartedAt(null)
    setNowTick(Date.now())
    setDurationMinutes(String(minutesFromMs(total)))
  }

  // Behind a confirmation (see the ConfirmDialog below) - wipes the timer
  // and the duration it filled in, back to a never-started state.
  function clearTimer() {
    setTimerStartedAt(null)
    setTimerAccumulatedMs(0)
    setDurationMinutes('')
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setExerciseOrder((order) => {
      const currentBlocks = buildBlocks(order, exercisesById, overrides)
      const target = index + direction
      if (target < 0 || target >= currentBlocks.length) return order
      const next = [...currentBlocks]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next.flatMap((b) => (b.type === 'pair' ? [b.peId, b.partnerId] : [b.peId]))
    })
  }

  function entryFor(peId: number): ExerciseLogEntry | null {
    const pe = exercisesById.get(peId)
    if (!pe) return null
    const effectiveExId = effectiveExerciseId(pe, overrides)
    const displayPe = effectiveExId === pe.exercise ? pe : { ...pe, exercise: effectiveExId, exercise_name: exerciseBankById.get(effectiveExId)?.name ?? pe.exercise_name }
    const draft = drafts[peId] ?? { warmup: [], working: [], dropset: [] }
    return {
      planExercise: displayPe,
      exercise: exerciseBankById.get(effectiveExId) ?? null,
      warmupSets: draft.warmup,
      workingSets: draft.working,
      dropsetSets: draft.dropset ?? [],
      onWarmupSetsChange: (warmup) => setDrafts((d) => ({ ...d, [peId]: { ...d[peId], warmup } })),
      onWorkingSetsChange: (working) => setDrafts((d) => ({ ...d, [peId]: { ...d[peId], working } })),
      onDropsetSetsChange: (dropset) => setDrafts((d) => ({ ...d, [peId]: { ...d[peId], dropset } })),
    }
  }

  function substitutionBadge(peId: number) {
    const pe = exercisesById.get(peId)
    const subId = overrides[peId]?.substitutedExercise
    if (!pe || !subId) return null
    return (
      <p key={peId} className="mb-1 text-xs font-medium text-amber-600 dark:text-amber-400">
        Off-program: swapped in for {pe.exercise_name}
      </p>
    )
  }

  async function handleSave() {
    setError(null)
    // If the timer's still running, freeze it now rather than trusting
    // whatever durationMinutes' last periodic tick happened to write - this
    // computes fresh, right at the moment of saving, and updates state too
    // (rather than relying on pauseTimer(), whose setState wouldn't be
    // visible until the next render) so the payload below uses the same
    // value the form will go on to show.
    const finalDurationMinutes =
      timerStartedAt !== null
        ? String(minutesFromMs(timerElapsedMs(timerAccumulatedMs, timerStartedAt, Date.now())))
        : durationMinutes
    if (timerStartedAt !== null) {
      setDurationMinutes(finalDurationMinutes)
      setTimerStartedAt(null)
      setTimerAccumulatedMs(0)
    }
    const loggedExercises = exerciseOrder
      .map((peId, order) => {
        const draft = drafts[peId] ?? { warmup: [], working: [], dropset: [] }
        const pe = exercisesById.get(peId)
        const isUnilateral = pe
          ? (exerciseBankById.get(effectiveExerciseId(pe, overrides))?.is_unilateral ?? false)
          : false
        const warmupSets = draftSetsToPayload(draft.warmup, weightUnit, 1, isUnilateral)
        const workingSets = draftSetsToPayload(draft.working, weightUnit, warmupSets.length + 1, isUnilateral)
        const dropsetSets = draftSetsToPayload(
          draft.dropset ?? [],
          weightUnit,
          warmupSets.length + workingSets.length + 1,
          isUnilateral,
        )
        const substitutedExercise = overrides[peId]?.substitutedExercise ?? null
        const supersetPartner = pe ? effectiveSupersetPartner(peId, exercisesById, overrides) : null
        return {
          plan_exercise: peId,
          substituted_exercise: substitutedExercise,
          superset_partner: supersetPartner,
          sets: [...warmupSets, ...workingSets, ...dropsetSets],
          order,
        }
      })
      .filter((le) => le.sets.length > 0)

    if (loggedExercises.length === 0) {
      setError('Log at least one set to save.')
      return
    }

    // A superset partner that ended up with no logged sets (and so got
    // filtered out above) can't be referenced - the backend requires a
    // partner to also be logged in this same request.
    const includedIds = new Set(loggedExercises.map((le) => le.plan_exercise))
    const payload: NewWorkoutSessionLog = {
      plan_session: session.id,
      date,
      notes: notes.trim(),
      duration_minutes: finalDurationMinutes.trim() ? Number(finalDurationMinutes) : null,
      calories_burned: caloriesBurned.trim() ? Number(caloriesBurned) : null,
      logged_exercises: loggedExercises.map(({ plan_exercise, substituted_exercise, superset_partner, sets }) => ({
        plan_exercise,
        substituted_exercise,
        superset_partner: superset_partner !== null && includedIds.has(superset_partner) ? superset_partner : null,
        sets,
      })),
    }

    setSaving(true)
    try {
      const savedLog = await saveWorkoutSession(payload)
      clearWorkoutDraft(session.id, date)
      setRestoredFromDraft(false)
      onSaved(savedLog)
      setSaved(true)
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 403
          ? 'Only the trainee can log their own sessions.'
          : 'Could not save this session.',
      )
    } finally {
      setSaving(false)
    }
  }

  // Runs from the "Remove log" ConfirmDialog below, never directly.
  async function handleClear() {
    if (!existingLog) return
    setDeleting(true)
    setError(null)
    try {
      await deleteWorkoutSession(existingLog.id)
      clearWorkoutDraft(session.id, date)
      setRestoredFromDraft(false)
      onDeleted()
    } catch {
      setError('Could not remove this log.')
    } finally {
      setDeleting(false)
    }
  }

  const focusedBlock = blocks.find((b) => b.peId === focusedPeId) ?? null

  if (focusedBlock) {
    const entryA = entryFor(focusedBlock.peId)
    const entryB = focusedBlock.type === 'pair' ? entryFor(focusedBlock.partnerId) : null
    const headerEntries = [entryA, entryB].filter((e): e is ExerciseLogEntry => e !== null)

    return (
      <div className="-mx-4 flex flex-col gap-3">
        <div
          className="sticky z-10 flex items-center gap-2 border-b border-border bg-background px-4 pb-3 pt-1"
          style={{ top: 'calc(var(--header-height) + env(safe-area-inset-top))' }}
        >
          <Button type="button" variant="ghost" size="icon" aria-label="Back to session" onClick={() => setFocusedPeId(null)}>
            <ArrowLeft className="size-5" />
          </Button>
          {/* One line per exercise (two for a superset), each with its own ⓘ -
              trainees often only glance at the name in the overview list, so
              the description/video/muscles need to be reachable here too. */}
          <div className="flex min-w-0 flex-1 flex-col">
            {headerEntries.map((entry, i) => (
              <div key={entry.planExercise.id} className="flex min-w-0 items-center gap-1.5">
                <span className="min-w-0 truncate font-semibold">
                  {i > 0 && '+ '}
                  {entry.planExercise.exercise_name}
                </span>
                <ExerciseInfoButton
                  name={entry.planExercise.exercise_name}
                  exercise={entry.exercise}
                  exercisesById={exerciseBankById}
                  muscleGroups={muscleGroups}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 px-4">
          {focusedBlock.type === 'pair' && entryA && entryB ? (
            <>
              {substitutionBadge(focusedBlock.peId)}
              {substitutionBadge(focusedBlock.partnerId)}
              <SupersetLogBlock entries={[entryA, entryB]} weightUnit={weightUnit} />
            </>
          ) : entryA ? (
            <>
              {substitutionBadge(focusedBlock.peId)}
              <ExerciseLogBlock
                planExercise={entryA.planExercise}
                exercise={entryA.exercise}
                weightUnit={weightUnit}
                warmupSets={entryA.warmupSets}
                workingSets={entryA.workingSets}
                dropsetSets={entryA.dropsetSets}
                onWarmupSetsChange={entryA.onWarmupSetsChange}
                onWorkingSetsChange={entryA.onWorkingSetsChange}
                onDropsetSetsChange={entryA.onDropsetSetsChange}
              />
            </>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-1.5 overflow-hidden">
          <Label htmlFor="log-date">Date</Label>
          <Input
            id="log-date"
            type="date"
            value={date}
            max={toDateKey(new Date())}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="log-session">Session</Label>
          <Select value={String(selectedSessionId)} onValueChange={(v) => onSelectSession(Number(v))}>
            <SelectTrigger id="log-session" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5">
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">Workout timer</span>
          {timerIdle ? (
            <span className="text-xs text-muted-foreground">Fills in duration below automatically</span>
          ) : (
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatElapsed(timerElapsedMs(timerAccumulatedMs, timerStartedAt, nowTick))}{' '}
              {timerStartedAt !== null ? 'elapsed' : 'paused'}
            </span>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {!timerIdle && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setClearTimerOpen(true)}>
              Clear
            </Button>
          )}
          {timerStartedAt !== null ? (
            <Button type="button" size="sm" onClick={pauseTimer}>
              Pause
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={handleStartTimer}>
              {timerIdle ? 'Start session' : 'Resume'}
            </Button>
          )}
        </div>
      </div>

      {isFirstLog && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-border px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-normal text-muted-foreground">Weight unit</Label>
            <div className="flex gap-1 rounded-full bg-muted p-0.5 text-xs">
              {(['lb', 'kg'] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setWeightUnit(unit)}
                  className={cn(
                    'rounded-full px-2 py-0.5 font-medium',
                    weightUnit === unit ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Applies to every exercise below. To change your default, go to{' '}
            <Link to="/preferences" className="underline underline-offset-2">
              Unit Preferences
            </Link>
            .
          </p>
        </div>
      )}

      {/* Rarely needed, so both tools sit behind one collapsed card rather than
          two always-visible buttons. Collapsing it also ends reorder mode, so
          the up/down chevrons never linger with their controls hidden. */}
      <CollapsibleSection
        title="Modify session"
        summary={reordering ? 'Reordering…' : undefined}
        open={modifyOpen}
        onOpenChange={(next) => {
          setModifyOpen(next)
          if (!next) setReordering(false)
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={reordering ? 'default' : 'outline'}
            size="sm"
            onClick={() => setReordering((r) => !r)}
          >
            {reordering ? 'Done reordering' : 'Reorder exercises'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setOffProgramOpen(true)}>
            Off-program exercise
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Reorder moves exercises up or down for today. Off-program swaps in a different exercise or pairs/unpairs a
          superset - today's log only, your plan stays the same.
        </p>
      </CollapsibleSection>

      {session.notes.trim() !== '' && (
        <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
          <p className="mb-0.5 text-xs font-semibold text-primary">Note from your trainer</p>
          <p className="text-sm text-foreground">{session.notes}</p>
        </div>
      )}

      {existingLog && (
        <p className="text-xs text-muted-foreground">Already logged — editing your existing entry.</p>
      )}
      {restoredFromDraft && (
        <p className="text-xs text-muted-foreground">Restored your unsaved changes from before.</p>
      )}

      <ul className="flex flex-col gap-2">
        {blocks.map((block, index) => {
          if (block.type === 'pair') {
            const entryA = entryFor(block.peId)
            const entryB = entryFor(block.partnerId)
            if (!entryA || !entryB) return null
            return (
              <li key={block.peId}>
                {substitutionBadge(block.peId)}
                {substitutionBadge(block.partnerId)}
                <SupersetLogListRow
                  planExerciseA={entryA.planExercise}
                  planExerciseB={entryB.planExercise}
                  exerciseA={entryA.exercise}
                  exerciseB={entryB.exercise}
                  exercisesById={exerciseBankById}
                  muscleGroups={muscleGroups}
                  confirmedRounds={countConfirmedRounds(entryA, entryB)}
                  targetRounds={Math.max(entryA.planExercise.target_sets, entryB.planExercise.target_sets)}
                  onMoveUp={() => moveBlock(index, -1)}
                  onMoveDown={() => moveBlock(index, 1)}
                  canMoveUp={index > 0}
                  canMoveDown={index < blocks.length - 1}
                  reordering={reordering}
                  onLog={() => setFocusedPeId(block.peId)}
                />
              </li>
            )
          }

          const entry = entryFor(block.peId)
          if (!entry) return null
          return (
            <li key={block.peId}>
              {substitutionBadge(block.peId)}
              <ExerciseLogListRow
                planExercise={entry.planExercise}
                exercise={entry.exercise}
                exercisesById={exerciseBankById}
                muscleGroups={muscleGroups}
                confirmedWorkingCount={entry.workingSets.filter((s) => s.confirmed).length}
                onMoveUp={() => moveBlock(index, -1)}
                onMoveDown={() => moveBlock(index, 1)}
                canMoveUp={index > 0}
                canMoveDown={index < blocks.length - 1}
                reordering={reordering}
                onLog={() => setFocusedPeId(block.peId)}
              />
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="log-notes">Notes (optional)</Label>
        <Textarea
          id="log-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="felt easy today, used spotter, gym was packed…"
        />
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="log-duration" className="shrink-0">
          Session duration (minutes, optional)
        </Label>
        <Input
          id="log-duration"
          type="number"
          inputMode="numeric"
          min="0"
          value={durationMinutes}
          onChange={(e) => {
            setDurationMinutes(e.target.value)
            // A manual edit takes over from the timer entirely - it's the
            // trainee's number now, not the timer's.
            setTimerStartedAt(null)
            setTimerAccumulatedMs(0)
          }}
          className="ml-auto w-28"
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Label htmlFor="log-calories" className="shrink-0">
            Calories burned (optional)
          </Label>
          <Input
            id="log-calories"
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="from watch"
            value={caloriesBurned}
            onChange={(e) => setCaloriesBurned(e.target.value)}
            className="ml-auto w-28"
          />
        </div>
        <p className="text-justify text-xs text-muted-foreground">
          For a more precise daily total, add your day's total in{' '}
          <Link
            to="/tracker"
            state={{ scrollTo: 'daily-active-energy-field' }}
            className="underline underline-offset-2"
          >
            Daily → Active energy (kcal)
          </Link>{' '}
          instead — this is still useful for your own history either way.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && !error && <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>}

      <div className="flex flex-col gap-2">
        <Button type="button" className="w-full" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : existingLog ? 'Update log' : 'Save log'}
        </Button>
        {existingLog && (
          <Button type="button" variant="outline" className="w-full" disabled={deleting} onClick={() => setRemoveLogOpen(true)}>
            {deleting ? 'Removing…' : 'Remove log'}
          </Button>
        )}
        {footer}
      </div>

      <ConfirmDialog
        open={removeLogOpen}
        onOpenChange={setRemoveLogOpen}
        title="Remove this logged session?"
        description="This deletes every set you logged for this session on this date. It can't be undone."
        confirmLabel="Remove log"
        confirmingLabel="Removing…"
        onConfirm={handleClear}
      />
      <ConfirmDialog
        open={clearTimerOpen}
        onOpenChange={setClearTimerOpen}
        title="Clear the workout timer?"
        description="This resets the timer to zero and clears the session duration it filled in."
        confirmLabel="Clear"
        confirmingLabel="Clearing…"
        onConfirm={clearTimer}
      />
      <OffProgramDialog
        open={offProgramOpen}
        onOpenChange={setOffProgramOpen}
        exerciseOrder={exerciseOrder}
        exercisesById={exercisesById}
        exerciseBank={exercises}
        exerciseBankById={exerciseBankById}
        overrides={overrides}
        onOverridesChange={setOverrides}
      />
    </div>
  )
}
