import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
import ExerciseLogBlock, { type DraftSet } from './ExerciseLogBlock'
import ExerciseLogListRow from './ExerciseLogListRow'
import OffProgramDialog from './OffProgramDialog'
import { newDraftSet } from './SetRows'
import SupersetLogBlock, { type ExerciseLogEntry } from './SupersetLogBlock'
import SupersetLogListRow from './SupersetLogListRow'

type ExerciseDrafts = { warmup: DraftSet[]; working: DraftSet[] }

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
}: Props) {
  const session = sessions.find((s) => s.id === selectedSessionId) ?? sessions[0]
  const [exerciseOrder, setExerciseOrder] = useState<number[]>([])
  const [drafts, setDrafts] = useState<Record<number, ExerciseDrafts>>({})
  // Which block (by its first plan_exercise id) is currently open in the
  // full-screen logging view - null shows the session overview list instead.
  // Only one at a time, for the same reason reordering only ever shows one
  // thing at once: no risk of "the block I tapped" shifting under a finger.
  const [focusedPeId, setFocusedPeId] = useState<number | null>(null)
  const [reordering, setReordering] = useState(false)
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lb')
  const [notes, setNotes] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  const [overrides, setOverrides] = useState<ExerciseOverrideMap>({})
  const [offProgramOpen, setOffProgramOpen] = useState(false)

  useEffect(() => {
    listExercises().then(setExercises).catch(() => setExercises([]))
    listMuscleGroups().then(setMuscleGroups).catch(() => setMuscleGroups([]))
  }, [])

  const exerciseBankById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  useEffect(() => {
    if (!session) return
    setSaved(false)
    setError(null)
    setReordering(false)
    setFocusedPeId(null)

    if (existingLog) {
      const byPlanExercise = new Map(existingLog.logged_exercises.map((le) => [le.plan_exercise, le]))
      const nextDrafts: Record<number, ExerciseDrafts> = {}
      let unit: WeightUnit = 'lb'
      const order = [...existingLog.logged_exercises].sort((a, b) => a.order - b.order).map((le) => le.plan_exercise)
      for (const pe of session.exercises) {
        if (!order.includes(pe.id)) order.push(pe.id)
        const logged = byPlanExercise.get(pe.id)
        if (logged && logged.sets.length > 0) {
          unit = logged.sets[0].weight_unit
          const toDraft = (s: (typeof logged.sets)[number]): DraftSet => ({
            ...newDraftSet(s.is_warmup),
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
            working: logged.sets.filter((s) => !s.is_warmup).map(toDraft),
          }
        } else {
          nextDrafts[pe.id] = { warmup: [], working: [newDraftSet(false)] }
        }
      }
      const nextOverrides: ExerciseOverrideMap = {}
      for (const le of existingLog.logged_exercises) {
        if (le.substituted_exercise !== null || le.superset_partner !== null) {
          nextOverrides[le.plan_exercise] = { substitutedExercise: le.substituted_exercise, supersetPartner: le.superset_partner }
        }
      }
      setExerciseOrder(order)
      setDrafts(nextDrafts)
      setOverrides(nextOverrides)
      setWeightUnit(unit)
      setNotes(existingLog.notes)
      setDurationMinutes(existingLog.duration_minutes !== null ? String(existingLog.duration_minutes) : '')
    } else {
      const nextDrafts: Record<number, ExerciseDrafts> = {}
      for (const pe of session.exercises) {
        nextDrafts[pe.id] = { warmup: [], working: [newDraftSet(false)] }
      }
      setExerciseOrder(session.exercises.map((pe) => pe.id))
      setDrafts(nextDrafts)
      setOverrides({})
      setNotes('')
      setDurationMinutes('')
    }
  }, [session, existingLog])

  if (!session) {
    return <p className="text-sm text-muted-foreground">This plan has no sessions yet.</p>
  }

  const exercisesById = new Map(session.exercises.map((pe) => [pe.id, pe]))
  const blocks = buildBlocks(exerciseOrder, exercisesById, overrides)

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
    const draft = drafts[peId] ?? { warmup: [], working: [] }
    return {
      planExercise: displayPe,
      exercise: exerciseBankById.get(effectiveExId) ?? null,
      warmupSets: draft.warmup,
      workingSets: draft.working,
      onWarmupSetsChange: (warmup) => setDrafts((d) => ({ ...d, [peId]: { ...d[peId], warmup } })),
      onWorkingSetsChange: (working) => setDrafts((d) => ({ ...d, [peId]: { ...d[peId], working } })),
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
    const loggedExercises = exerciseOrder
      .map((peId, order) => {
        const draft = drafts[peId] ?? { warmup: [], working: [] }
        const pe = exercisesById.get(peId)
        const isUnilateral = pe
          ? (exerciseBankById.get(effectiveExerciseId(pe, overrides))?.is_unilateral ?? false)
          : false
        const warmupSets = draftSetsToPayload(draft.warmup, weightUnit, 1, isUnilateral)
        const workingSets = draftSetsToPayload(draft.working, weightUnit, warmupSets.length + 1, isUnilateral)
        const substitutedExercise = overrides[peId]?.substitutedExercise ?? null
        const supersetPartner = pe ? effectiveSupersetPartner(peId, exercisesById, overrides) : null
        return {
          plan_exercise: peId,
          substituted_exercise: substitutedExercise,
          superset_partner: supersetPartner,
          sets: [...warmupSets, ...workingSets],
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
      duration_minutes: durationMinutes.trim() ? Number(durationMinutes) : null,
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

  async function handleClear() {
    if (!existingLog) return
    if (!window.confirm('Remove this logged session?')) return
    setDeleting(true)
    setError(null)
    try {
      await deleteWorkoutSession(existingLog.id)
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
    const title =
      focusedBlock.type === 'pair' && entryA && entryB
        ? `${entryA.planExercise.exercise_name} + ${entryB.planExercise.exercise_name}`
        : (entryA?.planExercise.exercise_name ?? '')

    return (
      <div className="-mx-4 flex flex-col gap-3">
        <div
          className="sticky z-10 flex items-center gap-2 border-b border-border bg-background px-4 pb-3 pt-1"
          style={{ top: 'calc(var(--header-height) + env(safe-area-inset-top))' }}
        >
          <Button type="button" variant="ghost" size="icon" aria-label="Back to session" onClick={() => setFocusedPeId(null)}>
            <ArrowLeft className="size-5" />
          </Button>
          <span className="min-w-0 flex-1 truncate font-semibold">{title}</span>
        </div>

        <div className="flex flex-col gap-3 px-4">
          {focusedBlock.type === 'pair' && entryA && entryB ? (
            <>
              {substitutionBadge(focusedBlock.peId)}
              {substitutionBadge(focusedBlock.partnerId)}
              <SupersetLogBlock entries={[entryA, entryB]} />
            </>
          ) : entryA ? (
            <>
              {substitutionBadge(focusedBlock.peId)}
              <ExerciseLogBlock
                planExercise={entryA.planExercise}
                exercise={entryA.exercise}
                warmupSets={entryA.warmupSets}
                workingSets={entryA.workingSets}
                onWarmupSetsChange={entryA.onWarmupSetsChange}
                onWorkingSetsChange={entryA.onWorkingSetsChange}
              />
            </>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
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
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor="log-date">Date</Label>
          <Input
            id="log-date"
            type="date"
            value={date}
            max={toDateKey(new Date())}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
      </div>

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

      <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setReordering((r) => !r)}>
        {reordering ? 'Done reordering' : 'Reorder exercises'}
      </Button>

      <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setOffProgramOpen(true)}>
        Off-program exercise
      </Button>

      {session.notes.trim() !== '' && (
        <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
          <p className="mb-0.5 text-xs font-semibold text-primary">Note from your trainer</p>
          <p className="text-sm text-foreground">{session.notes}</p>
        </div>
      )}

      {existingLog && (
        <p className="text-xs text-muted-foreground">Already logged — editing your existing entry.</p>
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
          onChange={(e) => setDurationMinutes(e.target.value)}
          className="w-28"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && !error && <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>}

      <div className="flex flex-col gap-2">
        <Button type="button" className="w-full" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : existingLog ? 'Update log' : 'Save log'}
        </Button>
        {existingLog && (
          <Button type="button" variant="outline" className="w-full" disabled={deleting} onClick={handleClear}>
            {deleting ? 'Removing…' : 'Remove log'}
          </Button>
        )}
      </div>

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
