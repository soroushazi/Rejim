import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { createPlanExercise, deletePlanExercise, deletePlanSession, updatePlanExercise, updatePlanSession } from '@/api/workoutPlans'
import type { Exercise, PlanExerciseDetail, PlanSessionDetail } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

function ExerciseRow({
  exercise,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onChanged,
}: {
  exercise: PlanExerciseDetail
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onChanged: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [sets, setSets] = useState(String(exercise.target_sets))
  const [repsMin, setRepsMin] = useState(String(exercise.target_reps_min))
  const [repsMax, setRepsMax] = useState(String(exercise.target_reps_max))
  const [rest, setRest] = useState(String(exercise.default_rest_seconds))
  const [notes, setNotes] = useState(exercise.notes)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await updatePlanExercise(exercise.id, {
        target_sets: Number(sets) || 1,
        target_reps_min: Number(repsMin) || 1,
        target_reps_max: Number(repsMax) || 1,
        default_rest_seconds: Number(rest) || 0,
        notes,
      })
      setEditing(false)
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Remove ${exercise.exercise_name}?`)) return
    await deletePlanExercise(exercise.id)
    onChanged()
  }

  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <div className="flex flex-col">
            <button type="button" disabled={isFirst} onClick={onMoveUp} className="disabled:opacity-30">
              <ChevronUp className="size-3.5" />
            </button>
            <button type="button" disabled={isLast} onClick={onMoveDown} className="disabled:opacity-30">
              <ChevronDown className="size-3.5" />
            </button>
          </div>
          <span className="truncate text-sm font-medium">{exercise.exercise_name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
            {editing ? 'Close' : 'Edit'}
          </Button>
          <button type="button" onClick={remove} aria-label="Remove">
            <Trash2 className="size-4 text-destructive" />
          </button>
        </div>
      </div>

      {!editing ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {exercise.target_sets}×{exercise.target_reps_min}-{exercise.target_reps_max} · rest {exercise.default_rest_seconds}s
          {exercise.notes ? ` · "${exercise.notes}"` : ''}
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            <Input type="number" min="1" value={sets} onChange={(e) => setSets(e.target.value)} placeholder="Sets" />
            <Input type="number" min="1" value={repsMin} onChange={(e) => setRepsMin(e.target.value)} placeholder="Min reps" />
            <Input type="number" min="1" value={repsMax} onChange={(e) => setRepsMax(e.target.value)} placeholder="Max reps" />
          </div>
          <Input type="number" min="0" value={rest} onChange={(e) => setRest(e.target.value)} placeholder="Rest (seconds)" />
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cue for the trainee, e.g. 'keep your back straight'" />
          <Button type="button" size="sm" className="w-fit" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  )
}

function AddExerciseRow({ exercises, order, sessionId, onChanged }: { exercises: Exercise[]; order: number; sessionId: number; onChanged: () => void }) {
  const [adding, setAdding] = useState(false)
  const [exerciseId, setExerciseId] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!exerciseId) return
    setSaving(true)
    try {
      await createPlanExercise({
        session: sessionId,
        exercise: Number(exerciseId),
        target_sets: 3,
        target_reps_min: 8,
        target_reps_max: 12,
        default_rest_seconds: 120,
        order,
      })
      setAdding(false)
      setExerciseId('')
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  if (!adding) {
    return (
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setAdding(true)}>
        <Plus className="size-4" />
        Add exercise
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Select value={exerciseId} onValueChange={setExerciseId}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Pick an exercise…" />
        </SelectTrigger>
        <SelectContent>
          {exercises.map((ex) => (
            <SelectItem key={ex.id} value={String(ex.id)}>
              {ex.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" size="sm" disabled={saving || !exerciseId} onClick={handleAdd}>
        {saving ? 'Adding…' : 'Add'}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
        Cancel
      </Button>
    </div>
  )
}

type Props = {
  session: PlanSessionDetail
  exercises: Exercise[]
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onChanged: () => void
}

export default function SessionEditor({ session, exercises, isFirst, isLast, onMoveUp, onMoveDown, onChanged }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [label, setLabel] = useState(session.label)
  const [notes, setNotes] = useState(session.notes)
  const [saving, setSaving] = useState(false)

  async function saveDetails() {
    setSaving(true)
    try {
      await updatePlanSession(session.id, { label, notes })
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  async function removeSession() {
    if (!window.confirm(`Delete session '${session.label}'? This removes all its exercises too.`)) return
    await deletePlanSession(session.id)
    onChanged()
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex flex-col">
            <button type="button" disabled={isFirst} onClick={onMoveUp} className="disabled:opacity-30">
              <ChevronUp className="size-4" />
            </button>
            <button type="button" disabled={isLast} onClick={onMoveDown} className="disabled:opacity-30">
              <ChevronDown className="size-4" />
            </button>
          </div>
          <button type="button" className="truncate text-left font-semibold" onClick={() => setExpanded((v) => !v)}>
            {session.label} ({session.exercises.length})
          </button>
        </div>
        <button type="button" onClick={removeSession} aria-label="Delete session">
          <Trash2 className="size-4 text-destructive" />
        </button>
      </CardHeader>
      {expanded && (
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Session label" />
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Session note for the trainee, e.g. 'focus on tempo this week'" />
            <Button type="button" size="sm" className="w-fit" disabled={saving} onClick={saveDetails}>
              {saving ? 'Saving…' : 'Save details'}
            </Button>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            {session.exercises.map((ex, i) => (
              <ExerciseRow
                key={ex.id}
                exercise={ex}
                isFirst={i === 0}
                isLast={i === session.exercises.length - 1}
                onMoveUp={async () => {
                  const target = session.exercises[i - 1]
                  if (!target) return
                  await Promise.all([
                    updatePlanExercise(ex.id, { order: target.order }),
                    updatePlanExercise(target.id, { order: ex.order }),
                  ])
                  onChanged()
                }}
                onMoveDown={async () => {
                  const target = session.exercises[i + 1]
                  if (!target) return
                  await Promise.all([
                    updatePlanExercise(ex.id, { order: target.order }),
                    updatePlanExercise(target.id, { order: ex.order }),
                  ])
                  onChanged()
                }}
                onChanged={onChanged}
              />
            ))}
            <AddExerciseRow exercises={exercises} order={session.exercises.length} sessionId={session.id} onChanged={onChanged} />
          </div>
        </CardContent>
      )}
    </Card>
  )
}
