import { useEffect, useState } from 'react'
import { ApiError } from '@/api/client'
import { deleteWorkoutSession, saveWorkoutSession } from '@/api/workoutSessions'
import type {
  NewLoggedSet,
  NewWorkoutSessionLog,
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
import ExerciseLogBlock, { type DraftSet } from './ExerciseLogBlock'

type ExerciseDrafts = { warmup: DraftSet[]; working: DraftSet[] }

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

function draftSetsToPayload(sets: DraftSet[], weightUnit: WeightUnit, startNumber: number): NewLoggedSet[] {
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
  // Only one exercise card open at a time - besides the "not all open" ask,
  // this also avoids reordering shuffling an already-expanded neighbor into
  // the spot you just tapped, which read as "the card I clicked uncollapsed".
  const [expandedExerciseId, setExpandedExerciseId] = useState<number | null>(null)
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lb')
  const [notes, setNotes] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!session) return
    setSaved(false)
    setError(null)

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
            weight: s.weight,
            reps_done: String(s.reps_done),
            is_warmup: s.is_warmup,
            rpe: s.rpe !== null ? String(s.rpe) : '',
            confirmed: true,
          })
          nextDrafts[pe.id] = {
            warmup: logged.sets.filter((s) => s.is_warmup).map(toDraft),
            working: logged.sets.filter((s) => !s.is_warmup).map(toDraft),
          }
        } else {
          nextDrafts[pe.id] = { warmup: [], working: [{ weight: '', reps_done: '', is_warmup: false, rpe: '', confirmed: false }] }
        }
      }
      setExerciseOrder(order)
      setDrafts(nextDrafts)
      setWeightUnit(unit)
      setNotes(existingLog.notes)
      setDurationMinutes(existingLog.duration_minutes !== null ? String(existingLog.duration_minutes) : '')
    } else {
      const nextDrafts: Record<number, ExerciseDrafts> = {}
      for (const pe of session.exercises) {
        nextDrafts[pe.id] = { warmup: [], working: [{ weight: '', reps_done: '', is_warmup: false, rpe: '', confirmed: false }] }
      }
      setExerciseOrder(session.exercises.map((pe) => pe.id))
      setDrafts(nextDrafts)
      setNotes('')
      setDurationMinutes('')
    }
  }, [session, existingLog])

  if (!session) {
    return <p className="text-sm text-muted-foreground">This plan has no sessions yet.</p>
  }

  const exercisesById = new Map(session.exercises.map((pe) => [pe.id, pe]))

  function moveExercise(peId: number, direction: -1 | 1) {
    setExerciseOrder((order) => {
      const index = order.indexOf(peId)
      const target = index + direction
      if (target < 0 || target >= order.length) return order
      const next = [...order]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function handleSave() {
    setError(null)
    const loggedExercises = exerciseOrder
      .map((peId, order) => {
        const draft = drafts[peId] ?? { warmup: [], working: [] }
        const warmupSets = draftSetsToPayload(draft.warmup, weightUnit, 1)
        const workingSets = draftSetsToPayload(draft.working, weightUnit, warmupSets.length + 1)
        return { plan_exercise: peId, sets: [...warmupSets, ...workingSets], order }
      })
      .filter((le) => le.sets.length > 0)

    if (loggedExercises.length === 0) {
      setError('Log at least one set to save.')
      return
    }

    const payload: NewWorkoutSessionLog = {
      plan_session: session.id,
      date,
      notes: notes.trim(),
      duration_minutes: durationMinutes.trim() ? Number(durationMinutes) : null,
      logged_exercises: loggedExercises.map(({ plan_exercise, sets }) => ({ plan_exercise, sets })),
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

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
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
        <div className="flex min-w-0 flex-col gap-1.5">
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
        {exerciseOrder.map((peId, index) => {
          const pe = exercisesById.get(peId)
          if (!pe) return null
          const draft = drafts[peId] ?? { warmup: [], working: [] }
          return (
            <li key={peId}>
              <ExerciseLogBlock
                planExercise={pe}
                warmupSets={draft.warmup}
                workingSets={draft.working}
                onWarmupSetsChange={(warmup) => setDrafts((d) => ({ ...d, [peId]: { ...d[peId], warmup } }))}
                onWorkingSetsChange={(working) => setDrafts((d) => ({ ...d, [peId]: { ...d[peId], working } }))}
                weightUnit={weightUnit}
                onWeightUnitChange={setWeightUnit}
                onMoveUp={() => moveExercise(peId, -1)}
                onMoveDown={() => moveExercise(peId, 1)}
                canMoveUp={index > 0}
                canMoveDown={index < exerciseOrder.length - 1}
                expanded={expandedExerciseId === peId}
                onToggleExpanded={() => setExpandedExerciseId((cur) => (cur === peId ? null : peId))}
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="log-duration">Session duration (minutes, optional)</Label>
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

      <div className="flex gap-2">
        <Button type="button" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : existingLog ? 'Update log' : 'Save log'}
        </Button>
        {existingLog && (
          <Button type="button" variant="outline" disabled={deleting} onClick={handleClear}>
            {deleting ? 'Removing…' : 'Remove log'}
          </Button>
        )}
      </div>
    </div>
  )
}
