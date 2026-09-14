import { ChevronDown, ChevronUp, Link2, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  createPlanExercise,
  deletePlanExercise,
  deletePlanSession,
  pairPlanExercises,
  unpairPlanExercise,
  updatePlanExercise,
  updatePlanSession,
} from '@/api/workoutPlans'
import type { Exercise, MuscleGroup, PlanExerciseDetail, PlanSessionDetail } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ConfirmDialog from '@/components/ConfirmDialog'
import AddExerciseDialog from '@/pages/workout/AddExerciseDialog'

function ExerciseRow({
  exercise,
  siblings,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onChanged,
  autoExpand,
}: {
  exercise: PlanExerciseDetail
  // Other exercises in the same session - candidates for pairing as a superset.
  siblings: PlanExerciseDetail[]
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onChanged: () => void
  // Set right after this exercise is added to the session, so the trainer
  // lands straight in its sets/reps/rest details instead of a collapsed row
  // they'd have to re-open.
  autoExpand?: boolean
}) {
  const [editing, setEditing] = useState(!!autoExpand)
  const containerRef = useRef<HTMLDivElement>(null)
  const [sets, setSets] = useState(String(exercise.target_sets))
  const [repsMin, setRepsMin] = useState(String(exercise.target_reps_min))
  const [repsMax, setRepsMax] = useState(String(exercise.target_reps_max))
  const [rest, setRest] = useState(String(exercise.default_rest_seconds))
  const [notes, setNotes] = useState(exercise.notes)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [pairing, setPairing] = useState(false)

  async function pairWith(partnerId: number) {
    setPairing(true)
    try {
      await pairPlanExercises(exercise.id, partnerId)
      onChanged()
    } finally {
      setPairing(false)
    }
  }

  async function unpair() {
    setPairing(true)
    try {
      await unpairPlanExercise(exercise.id)
      onChanged()
    } finally {
      setPairing(false)
    }
  }

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
    await deletePlanExercise(exercise.id)
    onChanged()
  }

  useEffect(() => {
    // Only on mount - autoExpand is only ever true for the exercise's very
    // first render, right after it was added.
    if (autoExpand) containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  return (
    <div ref={containerRef} className="rounded-lg border border-border p-2.5">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={pairing}
                aria-label="Superset options"
                title={exercise.superset_with ? `Superset with ${exercise.superset_with_exercise_name}` : 'Pair as superset'}
              >
                <Link2 className={exercise.superset_with ? 'size-4 text-primary' : 'size-4 text-muted-foreground'} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {exercise.superset_with ? (
                <DropdownMenuItem onSelect={unpair}>Unpair (currently with {exercise.superset_with_exercise_name})</DropdownMenuItem>
              ) : siblings.length === 0 ? (
                <DropdownMenuItem disabled>No other exercises in this session yet</DropdownMenuItem>
              ) : (
                siblings.map((s) => (
                  <DropdownMenuItem key={s.id} onSelect={() => pairWith(s.id)}>
                    Pair with {s.exercise_name}
                    {s.superset_with ? ` (currently with ${s.superset_with_exercise_name})` : ''}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
            {editing ? 'Close' : 'Edit'}
          </Button>
          <button type="button" onClick={() => setConfirmingDelete(true)} aria-label="Remove">
            <Trash2 className="size-4 text-destructive" />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Remove ${exercise.exercise_name}?`}
        onConfirm={remove}
      />

      {exercise.superset_with && (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
          <Link2 className="size-3" /> Superset with {exercise.superset_with_exercise_name}
        </p>
      )}

      {!editing ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {exercise.target_sets}×{exercise.target_reps_min}-{exercise.target_reps_max} · rest {exercise.default_rest_seconds}s
          {exercise.notes ? ` · "${exercise.notes}"` : ''}
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              min="1"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              placeholder="Sets"
              autoFocus={autoExpand}
            />
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

function AddExerciseRow({
  exercises,
  muscleGroups,
  order,
  sessionId,
  onChanged,
  onAdded,
  onExerciseCreated,
}: {
  exercises: Exercise[]
  muscleGroups: MuscleGroup[]
  order: number
  sessionId: number
  onChanged: () => void
  onAdded: (id: number) => void
  onExerciseCreated: (exercise: Exercise) => void
}) {
  const [adding, setAdding] = useState(false)
  const [exerciseId, setExerciseId] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [addNewOpen, setAddNewOpen] = useState(false)

  async function addExerciseToSession(id: number) {
    setSaving(true)
    try {
      const created = await createPlanExercise({
        session: sessionId,
        exercise: id,
        target_sets: 3,
        target_reps_min: 8,
        target_reps_max: 12,
        default_rest_seconds: 120,
        order,
      })
      onAdded(created.id)
      setAdding(false)
      setExerciseId('')
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  function handleExerciseCreated(exercise: Exercise) {
    onExerciseCreated(exercise)
    addExerciseToSession(exercise.id)
  }

  if (!adding) {
    return (
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setAdding(true)}>
        <Plus className="size-4" />
        Add exercise
      </Button>
    )
  }

  const selectedExercise = exercises.find((ex) => String(ex.id) === exerciseId)
  const query = search.trim().toLowerCase()
  const results = query ? exercises.filter((ex) => ex.name.toLowerCase().includes(query)) : exercises

  return (
    <div className="flex flex-col gap-1.5">
      <DropdownMenu onOpenChange={(open) => !open && setSearch('')}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between gap-2 rounded-full font-normal">
            <span className="flex items-center gap-2 truncate">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              {selectedExercise ? selectedExercise.name : 'Pick an exercise…'}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
          <div className="p-1">
            <Input
              type="search"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              autoFocus
              className="h-8"
            />
          </div>
          {results.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">No matches.</p>}
          {results.map((ex) => (
            <DropdownMenuItem key={ex.id} onSelect={() => setExerciseId(String(ex.id))}>
              {ex.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          className="flex-1"
          disabled={saving || !exerciseId}
          onClick={() => addExerciseToSession(Number(exerciseId))}
        >
          {saving ? 'Adding…' : 'Add'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
          Cancel
        </Button>
      </div>
      <Button type="button" variant="link" className="h-auto w-fit justify-start px-0" onClick={() => setAddNewOpen(true)}>
        Can't find it? Add a new exercise
      </Button>
      <AddExerciseDialog open={addNewOpen} onOpenChange={setAddNewOpen} onCreated={handleExerciseCreated} muscleGroups={muscleGroups} />
    </div>
  )
}

type Props = {
  session: PlanSessionDetail
  exercises: Exercise[]
  muscleGroups: MuscleGroup[]
  onExerciseCreated: (exercise: Exercise) => void
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onChanged: () => void
}

export default function SessionEditor({
  session,
  exercises,
  muscleGroups,
  onExerciseCreated,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onChanged,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [label, setLabel] = useState(session.label)
  const [notes, setNotes] = useState(session.notes)
  const [saving, setSaving] = useState(false)
  const [newlyAddedExerciseId, setNewlyAddedExerciseId] = useState<number | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

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
    await deletePlanSession(session.id)
    onChanged()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
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
        <button type="button" onClick={() => setConfirmingDelete(true)} aria-label="Delete session">
          <Trash2 className="size-4 text-destructive" />
        </button>
      </CardHeader>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Delete session '${session.label}'?`}
        description="This removes all its exercises too."
        onConfirm={removeSession}
      />
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
                siblings={session.exercises.filter((other) => other.id !== ex.id)}
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
                autoExpand={ex.id === newlyAddedExerciseId}
              />
            ))}
            <AddExerciseRow
              exercises={exercises}
              muscleGroups={muscleGroups}
              order={session.exercises.length}
              sessionId={session.id}
              onChanged={onChanged}
              onAdded={setNewlyAddedExerciseId}
              onExerciseCreated={onExerciseCreated}
            />
          </div>
        </CardContent>
      )}
    </Card>
  )
}
