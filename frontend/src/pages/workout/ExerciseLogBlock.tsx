import { useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Trophy, X } from 'lucide-react'
import { listExerciseHistory } from '@/api/loggedSets'
import type { ExerciseHistorySet, PlanExerciseDetail, WeightUnit } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { checkPersonalRecord, type PersonalRecordKind } from '@/lib/personalRecord'
import { cn } from '@/lib/utils'
import { suggestWeight, weightDirectionFeedback, type WeightSuggestion } from '@/lib/weightSuggestion'
import ExerciseHistoryDialog from './ExerciseHistoryDialog'
import RestTimer from './RestTimer'

export type DraftSet = {
  weight: string
  reps_done: string
  is_warmup: boolean
  rpe: string
  /** UI-only: has the user finished entering this set (collapsed to a
   * one-line summary)? Never sent to the backend. */
  confirmed: boolean
}

function newDraftSet(isWarmup: boolean): DraftSet {
  return { weight: '', reps_done: '', is_warmup: isWarmup, rpe: '', confirmed: false }
}

/** One row's worth of inputs for a set still being entered. For working sets,
 * `suggestion` drives live feedback on the weight actually typed - not just a
 * static tint tied to the suggestion's direction, but whether *this* entry
 * follows it (e.g. still red if the suggestion says lower and the trainee
 * types the same or a higher weight). */
function SetEditorRow({
  label,
  set,
  onChange,
  onConfirm,
  onRemove,
  suggestion,
}: {
  label: string
  set: DraftSet
  onChange: (patch: Partial<DraftSet>) => void
  onConfirm: () => void
  onRemove: () => void
  suggestion?: WeightSuggestion
}) {
  const canConfirm = set.weight.trim() !== '' && set.reps_done.trim() !== ''
  const feedback =
    suggestion && set.weight.trim() !== '' ? weightDirectionFeedback(suggestion, Number(set.weight)) : null

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
        <Input
          type="number"
          inputMode="decimal"
          step="0.5"
          min="0"
          placeholder="Weight"
          value={set.weight}
          onChange={(e) => onChange({ weight: e.target.value })}
          className={cn(
            'h-8 w-20',
            feedback?.tone === 'good' && 'border-emerald-500/50 bg-emerald-500/5',
            feedback?.tone === 'bad' && 'border-destructive/50 bg-destructive/5',
          )}
        />
        <Input
          type="number"
          inputMode="numeric"
          step="1"
          min="0"
          placeholder="Reps"
          value={set.reps_done}
          onChange={(e) => onChange({ reps_done: e.target.value })}
          className="h-8 w-16"
        />
        <Input
          type="number"
          inputMode="decimal"
          step="0.5"
          min="1"
          max="10"
          placeholder="RPE"
          value={set.rpe}
          onChange={(e) => onChange({ rpe: e.target.value })}
          className="h-8 w-14"
        />
        <Button
          type="button"
          size="icon-sm"
          disabled={!canConfirm}
          onClick={onConfirm}
          aria-label={`Confirm ${label.toLowerCase()}`}
          className="ml-auto"
        >
          <Check className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label={`Remove ${label.toLowerCase()}`}
        >
          <X className="size-3.5" />
        </Button>
      </div>
      {feedback && (
        <p className={cn('text-xs', feedback.tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
          {feedback.note}
        </p>
      )}
    </div>
  )
}

/** A finished set, collapsed to one line - tap to re-open for editing. */
function SetSummaryRow({
  label,
  set,
  isPr,
  onEdit,
  onRemove,
}: {
  label: string
  set: DraftSet
  isPr: PersonalRecordKind
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-sm">
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className="text-muted-foreground">{label}</span> {set.weight} × {set.reps_done}
        {set.rpe.trim() ? ` · RPE ${set.rpe}` : ''}
      </button>
      {isPr && (
        <Badge className="gap-1 font-normal">
          <Trophy className="size-3" /> PR
        </Badge>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        aria-label={`Remove ${label.toLowerCase()}`}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  )
}

type Props = {
  planExercise: PlanExerciseDetail
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
  expanded: boolean
  onToggleExpanded: () => void
}

export default function ExerciseLogBlock({
  planExercise,
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
  expanded,
  onToggleExpanded,
}: Props) {
  const [history, setHistory] = useState<ExerciseHistorySet[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)

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
        <button
          type="button"
          className="flex min-w-0 flex-1 items-baseline justify-between gap-2 text-left"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
        >
          <span className="min-w-0 truncate font-medium">{planExercise.exercise_name}</span>
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {confirmedWorkingCount}/{planExercise.target_sets} sets · {planExercise.target_reps_min}-
            {planExercise.target_reps_max} reps
          </span>
        </button>
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
    </div>
  )
}
