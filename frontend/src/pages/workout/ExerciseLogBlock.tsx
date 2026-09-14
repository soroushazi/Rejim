import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import { listExerciseHistory } from '@/api/loggedSets'
import type { Exercise, ExerciseHistorySet, MuscleGroup, PlanExerciseDetail, WeightUnit } from '@/api/types'
import { Button } from '@/components/ui/button'
import { checkPersonalRecord, type PersonalRecordKind } from '@/lib/personalRecord'
import { cn } from '@/lib/utils'
import { suggestWeight } from '@/lib/weightSuggestion'
import ExerciseDetailDialog from './ExerciseDetailDialog'
import ExerciseHistoryDialog from './ExerciseHistoryDialog'
import RestTimer from './RestTimer'
import { newDraftSet, SetEditorRow, SetSummaryRow, type DraftSet } from './SetRows'

export type { DraftSet }

type Props = {
  planExercise: PlanExerciseDetail
  exercise: Exercise | null
  exercisesById: Map<number, Exercise>
  muscleGroups: MuscleGroup[]
  warmupSets: DraftSet[]
  workingSets: DraftSet[]
  onWarmupSetsChange: (sets: DraftSet[]) => void
  onWorkingSetsChange: (sets: DraftSet[]) => void
  weightUnit: WeightUnit
  onWeightUnitChange: (unit: WeightUnit) => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  reordering: boolean
  expanded: boolean
  onToggleExpanded: () => void
}

export default function ExerciseLogBlock({
  planExercise,
  exercise,
  exercisesById,
  muscleGroups,
  warmupSets,
  workingSets,
  onWarmupSetsChange,
  onWorkingSetsChange,
  weightUnit,
  onWeightUnitChange,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  reordering,
  expanded,
  onToggleExpanded,
}: Props) {
  const [history, setHistory] = useState<ExerciseHistorySet[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

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

  const suggestion = suggestWeight(history, planExercise.target_reps_min, planExercise.target_reps_max)
  const confirmedWorkingCount = workingSets.filter((s) => s.confirmed).length
  const hasActiveWarmup = warmupSets.some((s) => !s.confirmed)
  const allWorkingConfirmed = workingSets.length > 0 && workingSets.every((s) => s.confirmed)

  function prFor(set: DraftSet): PersonalRecordKind {
    if (set.weight.trim() === '' || set.reps_done.trim() === '') return null
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
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-0.5 px-3 py-2.5">
        <span className="min-w-0 shrink truncate font-medium">{planExercise.exercise_name}</span>
        <button
          type="button"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => setDetailsOpen(true)}
          aria-label={`View details for ${planExercise.exercise_name}`}
        >
          <Info className="size-4" />
        </button>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-baseline justify-end gap-2 text-left"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${planExercise.exercise_name}`}
        >
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {confirmedWorkingCount}/{planExercise.target_sets} sets · {planExercise.target_reps_min}-
            {planExercise.target_reps_max} reps
          </span>
        </button>
        {reordering && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canMoveUp}
              onClick={onMoveUp}
              aria-label={`Move ${planExercise.exercise_name} earlier`}
            >
              <ChevronUp className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canMoveDown}
              onClick={onMoveDown}
              aria-label={`Move ${planExercise.exercise_name} later`}
            >
              <ChevronDown className="size-4" />
            </Button>
          </>
        )}
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setHistoryOpen(true)}
            >
              View history
            </button>
            <div className="flex gap-1 rounded-full bg-muted p-0.5 text-xs">
              {(['lb', 'kg'] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => onWeightUnitChange(unit)}
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

          {planExercise.notes.trim() !== '' && (
            <div className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5">
              <p className="mb-0.5 text-xs font-semibold text-primary">Note from your trainer</p>
              <p className="text-sm text-foreground">{planExercise.notes}</p>
            </div>
          )}

          {suggestion.status === 'first' && (
            <p className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
              First time — enter weight with no suggestion.
            </p>
          )}
          {suggestion.status === 'low' && (
            <p className="rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
              Last time you lifted {suggestion.lastWeight}
              {suggestion.lastWeightUnit} and stayed under 8 reps — consider lowering the weight.
            </p>
          )}
          {suggestion.status === 'high' && (
            <p className="rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-400">
              Last time you lifted {suggestion.lastWeight}
              {suggestion.lastWeightUnit} and exceeded 12 reps — consider raising the weight.
            </p>
          )}
          {suggestion.status === 'good' && (
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
                  onEdit={() => updateWarmup(i, { confirmed: false })}
                  onRemove={() => removeWarmup(i)}
                />
              ) : (
                <SetEditorRow
                  key={i}
                  label={`Warm-up ${i + 1}`}
                  set={set}
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
                  onEdit={() => updateWorking(i, { confirmed: false })}
                  onRemove={() => removeWorking(i)}
                />
              ) : (
                <SetEditorRow
                  key={i}
                  label={`Set ${i + 1}`}
                  set={set}
                  suggestion={suggestion}
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
      )}

      <ExerciseHistoryDialog
        exerciseId={historyOpen ? planExercise.exercise : null}
        exerciseName={planExercise.exercise_name}
        onOpenChange={setHistoryOpen}
      />

      <ExerciseDetailDialog
        exercise={detailsOpen ? exercise : null}
        exercisesById={exercisesById}
        muscleGroups={muscleGroups}
        onOpenChange={setDetailsOpen}
      />
    </div>
  )
}
