import { useEffect, useState } from 'react'
import { listExerciseHistory } from '@/api/loggedSets'
import type { Exercise, ExerciseHistorySet, PlanExerciseDetail, WeightUnit } from '@/api/types'
import CollapsibleSection from '@/components/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { checkDraftSetPersonalRecord, type PersonalRecordKind } from '@/lib/personalRecord'
import {
  suggestedDropsetWeight,
  suggestedWarmupWeight,
  suggestedWorkingWeight,
  suggestionHint,
  suggestUnilateralWeight,
  suggestWeight,
} from '@/lib/weightSuggestion'
import ExerciseHistoryDisclosure from './ExerciseHistoryDisclosure'
import RestTimer from './RestTimer'
import { newDraftSet, SetEditorRow, SetSummaryRow, type DraftSet } from './SetRows'

export type { DraftSet }

type Props = {
  planExercise: PlanExerciseDetail
  exercise: Exercise | null
  /** The unit this session is being logged in - suggestions are converted to it. */
  weightUnit: WeightUnit
  warmupSets: DraftSet[]
  workingSets: DraftSet[]
  dropsetSets: DraftSet[]
  onWarmupSetsChange: (sets: DraftSet[]) => void
  onWorkingSetsChange: (sets: DraftSet[]) => void
  onDropsetSetsChange: (sets: DraftSet[]) => void
}

/** The actual set-logging content for one exercise - rendered as the body of
 * SessionLogForm's full-screen "Log exercise(s)" view, which supplies the
 * shared back-button header above it. */
export default function ExerciseLogBlock({
  planExercise,
  exercise,
  weightUnit,
  warmupSets,
  workingSets,
  dropsetSets,
  onWarmupSetsChange,
  onWorkingSetsChange,
  onDropsetSetsChange,
}: Props) {
  const [history, setHistory] = useState<ExerciseHistorySet[]>([])
  // Most trainees skip warm-ups, so the section starts collapsed - unless this
  // exercise already has some (a restored draft, or re-opening a saved log).
  const [warmupOpen, setWarmupOpen] = useState(warmupSets.length > 0)

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
  // PR detection doesn't cover per-side data yet (see lib/personalRecord.ts),
  // so it's skipped for a unilateral exercise rather than computed against
  // the wrong fields. Weight suggestions do have a per-side counterpart -
  // see suggestUnilateralWeight - so each branch gets its own suggestion
  // computed here; only one is ever actually shown, gated on isUnilateral
  // below.
  const suggestion = isUnilateral
    ? ({ status: 'first' } as const)
    : suggestWeight(history, planExercise.target_reps_min, planExercise.target_reps_max)
  const unilateralSuggestion = isUnilateral
    ? suggestUnilateralWeight(history, planExercise.target_reps_min, planExercise.target_reps_max)
    : ({ status: 'first' } as const)
  const activeSuggestion = isUnilateral ? unilateralSuggestion : suggestion
  // Placeholders only - greyed in an empty Weight field, never a value. The
  // reason (hint) shows under the first working set, before it's lifted.
  const workingPlaceholder = suggestedWorkingWeight(activeSuggestion, weightUnit)
  const warmupPlaceholder = suggestedWarmupWeight(workingPlaceholder, weightUnit)
  const hint = suggestionHint(
    activeSuggestion,
    workingPlaceholder,
    weightUnit,
    planExercise.target_reps_min,
    planExercise.target_reps_max,
  )
  const lastConfirmedWorking = workingSets.filter((s) => s.confirmed).at(-1)
  const dropsetPlaceholder = lastConfirmedWorking
    ? suggestedDropsetWeight(isUnilateral ? lastConfirmedWorking.weight_left : lastConfirmedWorking.weight, weightUnit)
    : null
  const hasActiveWarmup = warmupSets.some((s) => !s.confirmed)
  const allWorkingConfirmed = workingSets.length > 0 && workingSets.every((s) => s.confirmed)

  function prFor(set: DraftSet): PersonalRecordKind {
    return checkDraftSetPersonalRecord(history, set, isUnilateral)
  }

  function updateWarmup(index: number, patch: Partial<DraftSet>) {
    const nextWarmup = warmupSets.map((s, i) => (i === index ? { ...s, ...patch } : s))
    onWarmupSetsChange(nextWarmup)
    // The first working set is pre-seeded blank before any warm-up exists
    // (see SessionLogForm), so unlike every later set it never got a chance
    // to inherit a default from a "previous" set at creation time - backfill
    // it here as long as the trainee hasn't already typed something in -
    // unless there's a suggested weight, since a warm-up weight would then
    // just bury that suggestion's placeholder.
    if (patch.confirmed && workingPlaceholder === null && workingSets.length > 0 && !workingSets[0].confirmed && workingSets[0].weight === '') {
      const confirmedWarmup = nextWarmup[index]
      onWorkingSetsChange(
        workingSets.map((s, i) =>
          i === 0
            ? { ...s, weight: confirmedWarmup.weight, weight_left: confirmedWarmup.weight_left, weight_right: confirmedWarmup.weight_right }
            : s,
        ),
      )
    }
  }
  function removeWarmup(index: number) {
    onWarmupSetsChange(warmupSets.filter((_, i) => i !== index))
  }
  function addWarmup() {
    onWarmupSetsChange([...warmupSets, newDraftSet(true, false, warmupSets[warmupSets.length - 1])])
  }

  function updateWorking(index: number, patch: Partial<DraftSet>) {
    onWorkingSetsChange(workingSets.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }
  function confirmWorking(index: number) {
    const updated = workingSets.map((s, i) => (i === index ? { ...s, confirmed: true } : s))
    if (updated.length < planExercise.target_sets && index === updated.length - 1) {
      updated.push(newDraftSet(false, false, updated[updated.length - 1]))
    }
    onWorkingSetsChange(updated)
  }
  function removeWorking(index: number) {
    onWorkingSetsChange(workingSets.filter((_, i) => i !== index))
  }
  function addWorking() {
    const previous = workingSets[workingSets.length - 1] ?? warmupSets[warmupSets.length - 1]
    onWorkingSetsChange([...workingSets, newDraftSet(false, false, previous)])
  }

  const hasActiveDropset = dropsetSets.some((s) => !s.confirmed)
  function updateDropset(index: number, patch: Partial<DraftSet>) {
    onDropsetSetsChange(dropsetSets.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }
  function removeDropset(index: number) {
    onDropsetSetsChange(dropsetSets.filter((_, i) => i !== index))
  }
  // The first drop set starts blank so its "half the last working set"
  // placeholder shows; later ones carry over the previous drop's weight.
  function addDropset() {
    const previous = dropsetSets[dropsetSets.length - 1]
    onDropsetSetsChange([...dropsetSets, newDraftSet(false, true, previous)])
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
      {activeSuggestion.status === 'first' && (
        <p className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
          First time — enter weight with no suggestion.
        </p>
      )}

      <CollapsibleSection
        title="Warm-up (optional)"
        summary={warmupSets.length ? `${warmupSets.length} ${warmupSets.length === 1 ? 'set' : 'sets'}` : undefined}
        open={warmupOpen}
        onOpenChange={setWarmupOpen}
      >
        <div className="flex flex-col gap-1.5">
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
                weightPlaceholder={warmupPlaceholder}
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
      </CollapsibleSection>

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
              suggestion={i === 0 ? suggestion : undefined}
              isUnilateral={isUnilateral}
              weightPlaceholder={workingPlaceholder}
              hint={i === 0 ? hint : null}
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

      {(allWorkingConfirmed || dropsetSets.length > 0) && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Drop sets</p>
          {dropsetSets.map((set, i) =>
            set.confirmed ? (
              <SetSummaryRow
                key={i}
                label={`Drop set ${i + 1}`}
                set={set}
                isPr={null}
                isUnilateral={isUnilateral}
                onEdit={() => updateDropset(i, { confirmed: false })}
                onRemove={() => removeDropset(i)}
              />
            ) : (
              <SetEditorRow
                key={i}
                label={`Drop set ${i + 1}`}
                set={set}
                isUnilateral={isUnilateral}
                weightPlaceholder={dropsetPlaceholder}
                onChange={(patch) => updateDropset(i, patch)}
                onConfirm={() => updateDropset(i, { confirmed: true })}
                onRemove={() => removeDropset(i)}
              />
            ),
          )}
          {allWorkingConfirmed && !hasActiveDropset && (
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={addDropset}>
              + Add drop set
            </Button>
          )}
        </div>
      )}

      <RestTimer defaultSeconds={planExercise.default_rest_seconds} />
    </div>
  )
}
