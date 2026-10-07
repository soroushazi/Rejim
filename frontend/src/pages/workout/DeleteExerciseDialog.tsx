import { useEffect, useState } from 'react'
import { ApiError } from '@/api/client'
import { deleteExercise, getExerciseUsage } from '@/api/exercises'
import type { Exercise, ExerciseUsage } from '@/api/types'
import SearchableSelect from '@/components/SearchableSelect'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

/** Trainer-only. An exercise nothing references is a plain confirm-and-delete.
 * One that's in use (plans, logged workouts, goals) shows where, and can only be
 * deleted by picking a replacement - everything moves over to it first (see
 * workouts/services.py::replace_exercise), the main use being a duplicate. */
export default function DeleteExerciseDialog({
  exercise,
  exercises,
  onOpenChange,
  onDeleted,
}: {
  exercise: Exercise
  /** The whole bank, for the replacement picker. */
  exercises: Exercise[]
  onOpenChange: (open: boolean) => void
  onDeleted: (id: number) => void
}) {
  const [usage, setUsage] = useState<ExerciseUsage | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [replacementId, setReplacementId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mounted fresh per exercise (keyed by the caller), so state starts clean.
  useEffect(() => {
    let cancelled = false
    getExerciseUsage(exercise.id)
      .then((data) => {
        if (!cancelled) setUsage(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [exercise.id])

  const replacement = exercises.find((e) => e.id === replacementId) ?? null
  const options = exercises.filter((e) => e.id !== exercise.id).sort((a, b) => a.name.localeCompare(b.name))
  const canDelete = usage !== null && (!usage.in_use || replacement !== null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await deleteExercise(exercise.id, usage?.in_use ? (replacement?.id ?? undefined) : undefined)
      onDeleted(exercise.id)
      onOpenChange(false)
    } catch (err) {
      const detail = err instanceof ApiError && typeof err.body === 'object' && err.body !== null ? (err.body as { detail?: string }).detail : undefined
      setError(detail ?? 'Something went wrong. Try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete {exercise.name}?</DialogTitle>
        </DialogHeader>

        {loadError && <p className="text-sm text-destructive">Couldn't check where this exercise is used.</p>}
        {!loadError && usage === null && <p className="text-sm text-muted-foreground">Checking where it's used…</p>}

        {usage !== null && !usage.in_use && (
          <p className="text-sm text-muted-foreground">It isn't in any plan, logged workout, or goal, so it can be deleted right away.</p>
        )}

        {usage !== null && usage.in_use && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex flex-col gap-1.5">
              <p>This exercise is in use:</p>
              <ul className="list-disc pl-5 text-muted-foreground">
                {usage.logged_count > 0 && (
                  <li>
                    Logged {plural(usage.logged_count, 'time')} by {plural(usage.logged_trainee_count, 'trainee')}
                  </li>
                )}
                {usage.plan_count > 0 && (
                  <li>
                    In {plural(usage.plan_count, 'workout plan')} ({plural(usage.plan_trainee_count, 'trainee')})
                  </li>
                )}
                {usage.goal_count > 0 && <li>In {plural(usage.goal_count, 'strength goal')}</li>}
              </ul>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="font-medium">Replace it with</p>
              <SearchableSelect
                placeholder="Pick an exercise"
                options={options}
                value={replacementId}
                onChange={setReplacementId}
              />
              <p className="text-xs text-muted-foreground">
                All of the above moves to the exercise you pick - logged history included - then this one is deleted. This can't be
                undone.
              </p>
              {replacement && replacement.is_unilateral !== exercise.is_unilateral && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {replacement.is_unilateral
                    ? `${replacement.name} is logged per side, but ${exercise.name} isn't - its past sets keep their single weight and reps.`
                    : `${exercise.name} is logged per side, but ${replacement.name} isn't - its past sets keep their left/right values.`}
                </p>
              )}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" size="sm" disabled={!canDelete || deleting} onClick={handleDelete}>
            {deleting ? 'Deleting…' : usage?.in_use ? 'Replace and delete' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
