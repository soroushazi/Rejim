import { useEffect, useState } from 'react'
import { listExerciseHistory } from '@/api/loggedSets'
import type { Exercise, ExerciseHistorySet, PlanExerciseDetail } from '@/api/types'
import { Button } from '@/components/ui/button'
import { checkPersonalRecord, type PersonalRecordKind } from '@/lib/personalRecord'
import { suggestWeight } from '@/lib/weightSuggestion'
import ExerciseHistoryDisclosure from './ExerciseHistoryDisclosure'
import RestTimer from './RestTimer'
import { newDraftSet, SetEditorRow, SetSummaryRow, type DraftSet } from './SetRows'

export type { DraftSet }

type Props = {
  planExercise: PlanExerciseDetail
  exercise: Exercise | null
  warmupSets: DraftSet[]
  workingSets: DraftSet[]
  onWarmupSetsChange: (sets: DraftSet[]) => void
  onWorkingSetsChange: (sets: DraftSet[]) => void
}

/** The actual set-logging content for one exercise - rendered as the body of
 * SessionLogForm's full-screen "Log exercise(s)" view, which supplies the
 * shared back-button header above it. */
export default function ExerciseLogBlock({
  planExercise,
  exercise,
  warmupSets,
  workingSets,
  onWarmupSetsChange,
  onWorkingSetsChange,
}: Props) {
  const [history, setHistory] = useState<ExerciseHistorySet[]>([])

  useEffect(() => {
    let cancelled = false
    listExerciseHistory(planExercise.exercise)
      .then((data) => {
        if (!cancelled) setHistory(data)
      })
      .catch(() => {
        if (!cancelled) setHistory([])
      })
    return () => {
      cancelled = true
    }
  }, [planExercise.exercise])

  const isUnilateral = exercise?.is_unilateral ?? false
  // Weight suggestions/PR detection don't cover per-side data yet (see
  // lib/weightSuggestion.ts/lib/personalRecord.ts), so both are skipped for
  // a unilateral exercise rather than computed against the wrong fields.
  const suggestion = isUnilateral
    ? ({ status: 'first' } as const)
    : suggestWeight(history, planExercise.target_reps_min, planExercise.target_reps_max)
  const hasActiveWarmup = warmupSets.some((s) => !s.confirmed)
  const allWorkingConfirmed = workingSets.length > 0 && workingSets.every((s) => s.confirmed)

  function prFor(set: DraftSet): PersonalRecordKind {
    if (isUnilateral || set.weight.trim() === '' || set.reps_done.trim() === '') return null
    return checkPersonalRecord(history, Number(set.weight), Number(set.reps_done), set.is_warmup)
  }

  function updateWarmup(index: number, patch: Partial<DraftSet>) {
    onWarmupSetsChange(warmupSets.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }
  function removeWarmup(index: number) {
    onWarmupSetsChange(warmupSets.filter((_, i) => i !== index))
  }
  function addWarmup() {
    onWarmupSetsChange([...warmupSets, newDraftSet(true)])
  }

  function updateWorking(index: number, patch: Partial<DraftSet>) {
    onWorkingSetsChange(workingSets.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }
  function confirmWorking(index: number) {
    const updated = workingSets.map((s, i) => (i === index ? { ...s, confirmed: true } : s))
    if (updated.length < planExercise.target_sets && index === updated.length - 1) {
      updated.push(newDraftSet(false))
    }
    onWorkingSetsChange(updated)
  }
  function removeWorking(index: number) {
    onWorkingSetsChange(workingSets.filter((_, i) => i !== index))
  }
  function addWorking() {
    onWorkingSetsChange([...workingSets, newDraftSet(false)])
  }

  return (
    <div className="flex flex-col gap-3">
      <ExerciseHistoryDisclosure targets={[{ exerciseId: planExercise.exercise, exerciseName: planExercise.exercise_name }]} />

      {planExercise.notes.trim() !== '' && (
        <div className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5">
          <p className="mb-0.5 text-xs font-semibold text-primary">Note from your trainer</p>
          <p className="text-sm text-foreground">{planExercise.notes}</p>
        </div>
      )}

      {isUnilateral && (
        <p className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
          Tracked per side — enter weight, reps, and RPE for left and right separately.
        </p>
      )}
      {!isUnilateral && suggestion.status === 'first' && (
        <p className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
          First time — enter weight with no suggestion.
        </p>
      )}
      {!isUnilateral && suggestion.status === 'low' && (
        <p className="rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
          Last time you lifted {suggestion.lastWeight}
          {suggestion.lastWeightUnit} and stayed under 8 reps — consider lowering the weight.
        </p>
      )}
      {!isUnilateral && suggestion.status === 'high' && (
        <p className="rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-400">
          Last time you lifted {suggestion.lastWeight}
          {suggestion.lastWeightUnit} and exceeded 12 reps — consider raising the weight.
        </p>
      )}
      {!isUnilateral && suggestion.status === 'good' && (
        <p className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
          Last time: {suggestion.lastWeight}
          {suggestion.lastWeightUnit} for ~{suggestion.avgReps} reps/set — same weight suggested.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-muted-foreground">Warm-up</p>
        {warmupSets.map((set, i) =>
          set.confirmed ? (
            <SetSummaryRow
              key={i}
              label={`Warm-up ${i + 1}`}
              set={set}
              isPr={null}
              isUnilateral={isUnilateral}
              onEdit={() => updateWarmup(i, { confirmed: false })}
              onRemove={() => removeWarmup(i)}
            />
          ) : (
            <SetEditorRow
              key={i}
              label={`Warm-up ${i + 1}`}
              set={set}
              isUnilateral={isUnilateral}
              onChange={(patch) => updateWarmup(i, patch)}
              onConfirm={() => updateWarmup(i, { confirmed: true })}
              onRemove={() => removeWarmup(i)}
            />
          ),
        )}
        {!hasActiveWarmup && (
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={addWarmup}>
            + Add warm-up set
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-muted-foreground">Working sets</p>
        {workingSets.map((set, i) =>
          set.confirmed ? (
            <SetSummaryRow
              key={i}
              label={`Set ${i + 1}`}
              set={set}
              isPr={prFor(set)}
              isUnilateral={isUnilateral}
              onEdit={() => updateWorking(i, { confirmed: false })}
              onRemove={() => removeWorking(i)}
            />
          ) : (
            <SetEditorRow
              key={i}
              label={`Set ${i + 1}`}
              set={set}
              suggestion={suggestion}
              isUnilateral={isUnilateral}
              onChange={(patch) => updateWorking(i, patch)}
              onConfirm={() => confirmWorking(i)}
              onRemove={() => removeWorking(i)}
            />
          ),
        )}
        {allWorkingConfirmed && (
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={addWorking}>
            + Add set
          </Button>
        )}
      </div>

      <RestTimer defaultSeconds={planExercise.default_rest_seconds} />
    </div>
  )
}
