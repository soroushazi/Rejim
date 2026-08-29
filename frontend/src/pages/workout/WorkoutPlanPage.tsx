import { useEffect, useState } from 'react'
import { getWorkoutPlan, listWorkoutPlans, updatePlanExerciseNotes, updatePlanSessionNotes } from '@/api/workoutPlans'
import type { PlanExerciseDetail, PlanSessionDetail, WorkoutPlanDetail } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

function NoteEditor({
  value,
  placeholder,
  onSave,
}: {
  value: string
  placeholder: string
  onSave: (notes: string) => Promise<void>
}) {
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const dirty = draft !== value

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(draft)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Textarea
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        className="min-h-12 text-sm"
      />
      {dirty && (
        <Button type="button" size="sm" disabled={saving} onClick={handleSave} className="self-start">
          {saving ? 'Saving…' : 'Save note'}
        </Button>
      )}
    </div>
  )
}

function PlanExerciseRow({
  exercise,
  isTrainer,
  onSaveNotes,
}: {
  exercise: PlanExerciseDetail
  isTrainer: boolean
  onSaveNotes: (notes: string) => Promise<void>
}) {
  const [editingNote, setEditingNote] = useState(false)

  return (
    <li className="flex flex-col gap-1 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span>{exercise.exercise_name}</span>
        <span className="whitespace-nowrap text-muted-foreground">
          {exercise.target_sets}x{exercise.target_reps_min}-{exercise.target_reps_max} ·{' '}
          {exercise.default_rest_seconds}s rest
        </span>
      </div>

      {!isTrainer && exercise.notes.trim() !== '' && (
        <p className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{exercise.notes}</p>
      )}

      {isTrainer && !editingNote && (
        <button
          type="button"
          onClick={() => setEditingNote(true)}
          className="self-start text-left text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          {exercise.notes.trim() !== '' ? exercise.notes : '+ Add a cue for this exercise'}
        </button>
      )}
      {isTrainer && editingNote && (
        <NoteEditor
          value={exercise.notes}
          placeholder="Cue for this exercise…"
          onSave={async (notes) => {
            await onSaveNotes(notes)
            setEditingNote(false)
          }}
        />
      )}
    </li>
  )
}

function PlanSessionCard({
  session,
  defaultExpanded,
  isTrainer,
  onSaveSessionNotes,
  onSaveExerciseNotes,
}: {
  session: PlanSessionDetail
  defaultExpanded: boolean
  isTrainer: boolean
  onSaveSessionNotes: (notes: string) => Promise<void>
  onSaveExerciseNotes: (exerciseId: number, notes: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const exercises = [...session.exercises].sort((a, b) => a.order - b.order)

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3.5 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="font-semibold">{session.label}</span>
        <span className="text-xs text-muted-foreground">{exercises.length} exercises</span>
      </button>
      {expanded && (
        <div className="flex flex-col gap-3 border-t border-border px-3.5 py-3">
          {!isTrainer && session.notes.trim() !== '' && (
            <p className="rounded-md bg-muted px-2.5 py-1.5 text-sm text-muted-foreground">{session.notes}</p>
          )}
          {isTrainer && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground">Session note</p>
              <NoteEditor value={session.notes} placeholder="Guidance for this session…" onSave={onSaveSessionNotes} />
            </div>
          )}

          <ul className="flex flex-col gap-2.5">
            {exercises.map((ex) => (
              <PlanExerciseRow
                key={ex.id}
                exercise={ex}
                isTrainer={isTrainer}
                onSaveNotes={(notes) => onSaveExerciseNotes(ex.id, notes)}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}

export default function WorkoutPlanPage() {
  const { user } = useAuth()
  const isTrainer = user?.role === 'trainer'
  const [plan, setPlan] = useState<WorkoutPlanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    listWorkoutPlans()
      .then((plans) => (plans.length ? getWorkoutPlan(plans[0].id) : null))
      .then((detail) => {
        if (!cancelled) {
          setPlan(detail)
          setError(false)
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function saveSessionNotes(sessionId: number, notes: string) {
    const updated = await updatePlanSessionNotes(sessionId, notes)
    setPlan((p) =>
      p ? { ...p, sessions: p.sessions.map((s) => (s.id === sessionId ? { ...s, notes: updated.notes } : s)) } : p,
    )
  }

  async function saveExerciseNotes(sessionId: number, exerciseId: number, notes: string) {
    const updated = await updatePlanExerciseNotes(exerciseId, notes)
    setPlan((p) =>
      p
        ? {
            ...p,
            sessions: p.sessions.map((s) =>
              s.id === sessionId
                ? { ...s, exercises: s.exercises.map((e) => (e.id === exerciseId ? { ...e, notes: updated.notes } : e)) }
                : s,
            ),
          }
        : p,
    )
  }

  if (loading) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  }
  if (error) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">Couldn't load your workout plan.</p>
  }
  if (!plan) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">No workout plan yet.</p>
  }

  const sessions = [...plan.sessions].sort((a, b) => a.order - b.order)

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl bg-primary p-4 text-primary-foreground">
        <p className="text-sm font-medium opacity-90">{plan.name}</p>
        <p className="text-2xl font-semibold">
          {plan.sessions_per_week}x<span className="ml-1 text-sm font-normal opacity-80">per week</span>
        </p>
      </div>

      {sessions.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">This plan has no sessions yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((session, i) => (
            <PlanSessionCard
              key={session.id}
              session={session}
              defaultExpanded={i === 0}
              isTrainer={isTrainer}
              onSaveSessionNotes={(notes) => saveSessionNotes(session.id, notes)}
              onSaveExerciseNotes={(exerciseId, notes) => saveExerciseNotes(session.id, exerciseId, notes)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
