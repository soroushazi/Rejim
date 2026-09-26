import { useEffect, useState } from 'react'
import { Trophy, X } from 'lucide-react'
import { listExerciseHistory } from '@/api/loggedSets'
import type { Exercise, ExerciseHistorySet, PlanExerciseDetail } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { checkPersonalRecord } from '@/lib/personalRecord'
import { suggestWeight } from '@/lib/weightSuggestion'
import ExerciseHistoryDisclosure from './ExerciseHistoryDisclosure'
import RestTimer from './RestTimer'
import { newDraftSet, SetEditorRow, SetSummaryRow, type DraftSet } from './SetRows'

/** One exercise's slice of a superset - its plan config, drafts, and the
 * setters SessionLogForm already keeps per plan_exercise id. Bundled so
 * SupersetLogBlock takes exactly two of these instead of ~8 parallel props. */
export type ExerciseLogEntry = {
  planExercise: PlanExerciseDetail
  exercise: Exercise | null
  warmupSets: DraftSet[]
  workingSets: DraftSet[]
  dropsetSets: DraftSet[]
  onWarmupSetsChange: (sets: DraftSet[]) => void
  onWorkingSetsChange: (sets: DraftSet[]) => void
  onDropsetSetsChange: (sets: DraftSet[]) => void
}

function useHistory(exerciseId: number) {
  const [history, setHistory] = useState<ExerciseHistorySet[]>([])
  useEffect(() => {
    let cancelled = false
    listExerciseHistory(exerciseId)
      .then((data) => {
        if (!cancelled) setHistory(data)
      })
      .catch(() => {
        if (!cancelled) setHistory([])
      })
    return () => {
      cancelled = true
    }
  }, [exerciseId])
  return history
}

/** One side's warm-up section - independent per exercise, since which side
 * (if either) needs warming up varies by pairing. Stacked under the other
 * side (see the `flex-col` wrapper below), not side by side - a 2-column
 * grid squeezed each set-editor row too tight on a phone. */
function WarmupColumn({ entry }: { entry: ExerciseLogEntry }) {
  const { planExercise, exercise, warmupSets, workingSets, onWarmupSetsChange, onWorkingSetsChange } = entry
  const isUnilateral = exercise?.is_unilateral ?? false
  const hasActive = warmupSets.some((s) => !s.confirmed)

  function update(index: number, patch: Partial<DraftSet>) {
    const nextWarmup = warmupSets.map((s, i) => (i === index ? { ...s, ...patch } : s))
    onWarmupSetsChange(nextWarmup)
    // Backfills the pre-seeded-blank first round set for this exercise, same
    // rationale as ExerciseLogBlock's updateWarmup.
    if (patch.confirmed && workingSets.length > 0 && !workingSets[0].confirmed && workingSets[0].weight === '') {
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
  function remove(index: number) {
    onWarmupSetsChange(warmupSets.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium">{planExercise.exercise_name}</p>
      {warmupSets.map((set, i) =>
        set.confirmed ? (
          <SetSummaryRow
            key={i}
            label={`Warm-up ${i + 1}`}
            set={set}
            isPr={null}
            isUnilateral={isUnilateral}
            onEdit={() => update(i, { confirmed: false })}
            onRemove={() => remove(i)}
          />
        ) : (
          <SetEditorRow
            key={i}
            label={`Warm-up ${i + 1}`}
            set={set}
            isUnilateral={isUnilateral}
            onChange={(patch) => update(i, patch)}
            onConfirm={() => update(i, { confirmed: true })}
            onRemove={() => remove(i)}
          />
        ),
      )}
      {!hasActive && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => onWarmupSetsChange([...warmupSets, newDraftSet(true, false, warmupSets[warmupSets.length - 1])])}
        >
          + Add warm-up set
        </Button>
      )}
    </div>
  )
}

/** One side's drop-set section - independent per exercise, same rationale as
 * WarmupColumn, but only enabled (its "+ Add drop set" button shown) once
 * every round for both exercises is confirmed, since a drop set follows an
 * exercise's own last working set. Kept mounted (rather than unmounted) once
 * it has entries even if `enabled` later goes false, so editing an already-
 * confirmed round back open doesn't hide already-entered drop sets. */
function DropsetColumn({ entry, enabled }: { entry: ExerciseLogEntry; enabled: boolean }) {
  const { planExercise, exercise, warmupSets, workingSets, dropsetSets, onDropsetSetsChange } = entry
  const isUnilateral = exercise?.is_unilateral ?? false
  const hasActive = dropsetSets.some((s) => !s.confirmed)

  function update(index: number, patch: Partial<DraftSet>) {
    onDropsetSetsChange(dropsetSets.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }
  function remove(index: number) {
    onDropsetSetsChange(dropsetSets.filter((_, i) => i !== index))
  }

  if (!enabled && dropsetSets.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium">{planExercise.exercise_name}</p>
      {dropsetSets.map((set, i) =>
        set.confirmed ? (
          <SetSummaryRow
            key={i}
            label={`Drop set ${i + 1}`}
            set={set}
            isPr={null}
            isUnilateral={isUnilateral}
            onEdit={() => update(i, { confirmed: false })}
            onRemove={() => remove(i)}
          />
        ) : (
          <SetEditorRow
            key={i}
            label={`Drop set ${i + 1}`}
            set={set}
            isUnilateral={isUnilateral}
            onChange={(patch) => update(i, patch)}
            onConfirm={() => update(i, { confirmed: true })}
            onRemove={() => remove(i)}
          />
        ),
      )}
      {enabled && !hasActive && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => {
            const previous = dropsetSets[dropsetSets.length - 1] ?? workingSets[workingSets.length - 1] ?? warmupSets[warmupSets.length - 1]
            onDropsetSetsChange([...dropsetSets, newDraftSet(false, true, previous)])
          }}
        >
          + Add drop set
        </Button>
      )}
    </div>
  )
}

type Props = {
  entries: [ExerciseLogEntry, ExerciseLogEntry]
}

/** Logs a pair of exercises tied together as a superset: one working set of
 * each, back to back with no rest between them, counts as a single "round" -
 * rest only happens once the round is done. Warm-ups stay independent per
 * exercise (see WarmupColumn); only working sets are paired into rounds. No
 * backend concept of a "round" exists - saving still produces two ordinary
 * LoggedExercise entries (see SessionLogForm), one set_number per round.
 *
 * The actual set-logging content for a superset pair - rendered as the body
 * of SessionLogForm's full-screen "Log exercise(s)" view, which supplies the
 * shared back-button header above it. */
export default function SupersetLogBlock({ entries }: Props) {
  const [a, b] = entries
  const isUnilateralA = a.exercise?.is_unilateral ?? false
  const isUnilateralB = b.exercise?.is_unilateral ?? false
  const historyA = useHistory(a.planExercise.exercise)
  const historyB = useHistory(b.planExercise.exercise)

  // Weight suggestions/PR detection don't cover per-side data yet, so both
  // are skipped for whichever side is unilateral (see ExerciseLogBlock).
  const suggestionA = isUnilateralA
    ? ({ status: 'first' } as const)
    : suggestWeight(historyA, a.planExercise.target_reps_min, a.planExercise.target_reps_max)
  const suggestionB = isUnilateralB
    ? ({ status: 'first' } as const)
    : suggestWeight(historyB, b.planExercise.target_reps_min, b.planExercise.target_reps_max)

  const roundCount = Math.max(a.workingSets.length, b.workingSets.length, 1)
  const targetRounds = Math.max(a.planExercise.target_sets, b.planExercise.target_sets)
  const roundsAt = (i: number) => [a.workingSets[i] ?? newDraftSet(false), b.workingSets[i] ?? newDraftSet(false)] as const
  const confirmedRounds = Array.from({ length: roundCount }, (_, i) => roundsAt(i)).filter(
    ([sa, sb]) => sa.confirmed && sb.confirmed,
  ).length
  const allRoundsConfirmed = roundCount > 0 && confirmedRounds === roundCount

  function writeRound(i: number, patchA: Partial<DraftSet> | null, patchB: Partial<DraftSet> | null) {
    const [curA, curB] = roundsAt(i)
    const nextA = [...Array.from({ length: roundCount }, (_, j) => a.workingSets[j] ?? newDraftSet(false))]
    const nextB = [...Array.from({ length: roundCount }, (_, j) => b.workingSets[j] ?? newDraftSet(false))]
    nextA[i] = patchA ? { ...curA, ...patchA } : curA
    nextB[i] = patchB ? { ...curB, ...patchB } : curB
    a.onWorkingSetsChange(nextA)
    b.onWorkingSetsChange(nextB)
  }

  function confirmRound(i: number) {
    const nextA = Array.from({ length: roundCount }, (_, j) => (j === i ? { ...roundsAt(j)[0], confirmed: true } : roundsAt(j)[0]))
    const nextB = Array.from({ length: roundCount }, (_, j) => (j === i ? { ...roundsAt(j)[1], confirmed: true } : roundsAt(j)[1]))
    if (i === roundCount - 1 && roundCount < targetRounds) {
      nextA.push(newDraftSet(false, false, nextA[i]))
      nextB.push(newDraftSet(false, false, nextB[i]))
    }
    a.onWorkingSetsChange(nextA)
    b.onWorkingSetsChange(nextB)
  }

  function removeRound(i: number) {
    a.onWorkingSetsChange(Array.from({ length: roundCount }, (_, j) => roundsAt(j)[0]).filter((_, j) => j !== i))
    b.onWorkingSetsChange(Array.from({ length: roundCount }, (_, j) => roundsAt(j)[1]).filter((_, j) => j !== i))
  }

  function addRound() {
    const lastA = a.workingSets[a.workingSets.length - 1] ?? a.warmupSets[a.warmupSets.length - 1]
    const lastB = b.workingSets[b.workingSets.length - 1] ?? b.warmupSets[b.warmupSets.length - 1]
    a.onWorkingSetsChange([...Array.from({ length: roundCount }, (_, j) => roundsAt(j)[0]), newDraftSet(false, false, lastA)])
    b.onWorkingSetsChange([...Array.from({ length: roundCount }, (_, j) => roundsAt(j)[1]), newDraftSet(false, false, lastB)])
  }

  const restSeconds = Math.max(a.planExercise.default_rest_seconds, b.planExercise.default_rest_seconds)

  return (
    <div className="flex flex-col gap-3">
      <ExerciseHistoryDisclosure
        targets={[
          { exerciseId: a.planExercise.exercise, exerciseName: a.planExercise.exercise_name },
          { exerciseId: b.planExercise.exercise, exerciseName: b.planExercise.exercise_name },
        ]}
      />

      {[a, b].map((entry, idx) =>
        entry.planExercise.notes.trim() !== '' ? (
          <div key={idx} className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5">
            <p className="mb-0.5 text-xs font-semibold text-primary">Note for {entry.planExercise.exercise_name}</p>
            <p className="text-sm text-foreground">{entry.planExercise.notes}</p>
          </div>
        ) : null,
      )}

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-muted-foreground">Warm-up</p>
        <WarmupColumn entry={a} />
        <WarmupColumn entry={b} />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-muted-foreground">Rounds (one set of each, back to back)</p>
        {Array.from({ length: roundCount }, (_, i) => i).map((i) => {
          const [setA, setB] = roundsAt(i)
          const bothConfirmed = setA.confirmed && setB.confirmed
          function sideSummary(set: DraftSet, isUnilateral: boolean) {
            return isUnilateral ? (
              <>
                L {set.weight_left}×{set.reps_done_left} · R {set.weight_right}×{set.reps_done_right}
              </>
            ) : (
              <>
                {set.weight}×{set.reps_done}
              </>
            )
          }
          if (bothConfirmed) {
            const prA = isUnilateralA
              ? null
              : checkPersonalRecord(historyA, Number(setA.weight), Number(setA.reps_done), setA.is_warmup, setA.is_dropset)
            const prB = isUnilateralB
              ? null
              : checkPersonalRecord(historyB, Number(setB.weight), Number(setB.reps_done), setB.is_warmup, setB.is_dropset)
            return (
              <div key={i} className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-sm">
                <button
                  type="button"
                  onClick={() => writeRound(i, { confirmed: false }, { confirmed: false })}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="text-muted-foreground">Round {i + 1}</span>{' '}
                  {a.planExercise.exercise_name} {sideSummary(setA, isUnilateralA)}
                  {' → '}
                  {b.planExercise.exercise_name} {sideSummary(setB, isUnilateralB)}
                </button>
                {(prA || prB) && (
                  <Badge className="gap-1 font-normal">
                    <Trophy className="size-3" /> PR
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRound(i)}
                  aria-label={`Remove round ${i + 1}`}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            )
          }
          const canConfirmSide = (set: DraftSet, isUnilateral: boolean) =>
            isUnilateral
              ? [set.weight_left, set.weight_right, set.reps_done_left, set.reps_done_right].every(
                  (v) => v.trim() !== '',
                )
              : set.weight.trim() !== '' && set.reps_done.trim() !== ''
          const canConfirm = canConfirmSide(setA, isUnilateralA) && canConfirmSide(setB, isUnilateralB)
          return (
            <div key={i} className="flex flex-col gap-1.5 rounded-md border border-border p-2">
              <span className="text-xs font-medium text-muted-foreground">Round {i + 1}</span>
              <SetEditorRow
                label={a.planExercise.exercise_name}
                set={setA}
                suggestion={suggestionA}
                isUnilateral={isUnilateralA}
                onChange={(patch) => writeRound(i, patch, null)}
                onConfirm={() => {}}
                onRemove={() => {}}
                hideActions
              />
              <SetEditorRow
                label={b.planExercise.exercise_name}
                set={setB}
                suggestion={suggestionB}
                isUnilateral={isUnilateralB}
                onChange={(patch) => writeRound(i, null, patch)}
                onConfirm={() => {}}
                onRemove={() => {}}
                hideActions
              />
              <Button type="button" className="w-full" disabled={!canConfirm} onClick={() => confirmRound(i)}>
                Confirm round {i + 1}
              </Button>
            </div>
          )
        })}
        {allRoundsConfirmed && (
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={addRound}>
            + Add round
          </Button>
        )}
      </div>

      {(allRoundsConfirmed || a.dropsetSets.length > 0 || b.dropsetSets.length > 0) && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted-foreground">Drop sets</p>
          <DropsetColumn entry={a} enabled={allRoundsConfirmed} />
          <DropsetColumn entry={b} enabled={allRoundsConfirmed} />
        </div>
      )}

      <RestTimer defaultSeconds={restSeconds} />
    </div>
  )
}
