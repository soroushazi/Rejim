import { Check, Info, Trophy, X } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PersonalRecordKind } from '@/lib/personalRecord'
import { RPE_OPTIONS, rpeLabel } from '@/lib/rpe'
import { cn } from '@/lib/utils'
import { weightDirectionFeedback, type WeightSuggestion } from '@/lib/weightSuggestion'
import RpeInfoDialog from './RpeInfoDialog'

export type DraftSet = {
  weight: string
  reps_done: string
  is_warmup: boolean
  rpe: string
  /** Per-side values, used instead of the plain fields above when the
   * exercise is unilateral (Exercise.is_unilateral, e.g. Single-Arm Dumbbell
   * Row) - always present but only read/written when isUnilateral is set on
   * the row components below, mirroring backend LoggedSet's own _left/_right
   * pair. */
  weight_left: string
  weight_right: string
  reps_done_left: string
  reps_done_right: string
  rpe_left: string
  rpe_right: string
  /** UI-only: has the user finished entering this set (collapsed to a
   * one-line summary)? Never sent to the backend. */
  confirmed: boolean
}

export function newDraftSet(isWarmup: boolean): DraftSet {
  return {
    weight: '',
    reps_done: '',
    is_warmup: isWarmup,
    rpe: '',
    weight_left: '',
    weight_right: '',
    reps_done_left: '',
    reps_done_right: '',
    rpe_left: '',
    rpe_right: '',
    confirmed: false,
  }
}

/** One side's Weight/Reps/RPE trio - the unilateral equivalent of the plain
 * 3-column grid below, repeated once for Left and once for Right. */
function SideInputs({
  sideLabel,
  weight,
  reps,
  rpe,
  onWeightChange,
  onRepsChange,
  onRpeChange,
  onInfo,
}: {
  sideLabel: string
  weight: string
  reps: string
  rpe: string
  onWeightChange: (v: string) => void
  onRepsChange: (v: string) => void
  onRpeChange: (v: string) => void
  onInfo: () => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-4 shrink-0 text-center text-xs font-semibold text-muted-foreground">{sideLabel}</span>
      <div className="grid flex-1 grid-cols-3 gap-1.5">
        <Input
          type="number"
          inputMode="decimal"
          step="0.5"
          min="0"
          placeholder="Weight"
          value={weight}
          onChange={(e) => onWeightChange(e.target.value)}
          className="h-8 w-full"
        />
        <Input
          type="number"
          inputMode="numeric"
          step="1"
          min="0"
          placeholder="Reps"
          value={reps}
          onChange={(e) => onRepsChange(e.target.value)}
          className="h-8 w-full"
        />
        <div className="flex items-center gap-1">
          <Select value={rpe} onValueChange={onRpeChange}>
            <SelectTrigger size="sm" className="h-8 w-full" aria-label={`RPE (${sideLabel})`}>
              <SelectValue placeholder="RPE" />
            </SelectTrigger>
            <SelectContent>
              {RPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onInfo}
            aria-label="What is RPE?"
          >
            <Info className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/** One row's worth of inputs for a set still being entered. For working sets,
 * `suggestion` drives live feedback on the weight actually typed - not just a
 * static tint tied to the suggestion's direction, but whether *this* entry
 * follows it (e.g. still red if the suggestion says lower and the trainee
 * types the same or a higher weight). Shared between ExerciseLogBlock (one
 * exercise) and SupersetLogBlock (a paired round). */
export function SetEditorRow({
  label,
  set,
  onChange,
  onConfirm,
  onRemove,
  suggestion,
  hideActions,
  isUnilateral,
}: {
  label: string
  set: DraftSet
  onChange: (patch: Partial<DraftSet>) => void
  onConfirm: () => void
  onRemove: () => void
  suggestion?: WeightSuggestion
  /** Hides the per-row confirm/remove buttons - used when a caller confirms
   * multiple rows together (e.g. one superset round confirms both exercises
   * at once), so there's exactly one confirm action instead of two dead ones. */
  hideActions?: boolean
  /** Exercise.is_unilateral - swaps the single Weight/Reps/RPE row for one
   * Left and one Right row (see DraftSet's _left/_right fields). Weight
   * suggestions/live feedback don't cover per-side data yet, so `suggestion`
   * is ignored in this mode even if a caller passes one. */
  isUnilateral?: boolean
}) {
  const canConfirm = isUnilateral
    ? [set.weight_left, set.weight_right, set.reps_done_left, set.reps_done_right].every((v) => v.trim() !== '')
    : set.weight.trim() !== '' && set.reps_done.trim() !== ''
  const feedback =
    !isUnilateral && suggestion && set.weight.trim() !== ''
      ? weightDirectionFeedback(suggestion, Number(set.weight))
      : null
  const [rpeInfoOpen, setRpeInfoOpen] = useState(false)

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border p-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {isUnilateral ? (
        <div className="flex flex-col gap-1.5">
          <SideInputs
            sideLabel="L"
            weight={set.weight_left}
            reps={set.reps_done_left}
            rpe={set.rpe_left}
            onWeightChange={(v) => onChange({ weight_left: v })}
            onRepsChange={(v) => onChange({ reps_done_left: v })}
            onRpeChange={(v) => onChange({ rpe_left: v })}
            onInfo={() => setRpeInfoOpen(true)}
          />
          <SideInputs
            sideLabel="R"
            weight={set.weight_right}
            reps={set.reps_done_right}
            rpe={set.rpe_right}
            onWeightChange={(v) => onChange({ weight_right: v })}
            onRepsChange={(v) => onChange({ reps_done_right: v })}
            onRpeChange={(v) => onChange({ rpe_right: v })}
            onInfo={() => setRpeInfoOpen(true)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          <Input
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            placeholder="Weight"
            value={set.weight}
            onChange={(e) => onChange({ weight: e.target.value })}
            className={cn(
              'h-8 w-full',
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
            className="h-8 w-full"
          />
          <div className="flex items-center gap-1">
            <Select
              value={set.rpe}
              onValueChange={(v) => onChange({ rpe: v })}
            >
              <SelectTrigger size="sm" className="h-8 w-full" aria-label="RPE">
                <SelectValue placeholder="RPE" />
              </SelectTrigger>
              <SelectContent>
                {RPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setRpeInfoOpen(true)}
              aria-label="What is RPE?"
            >
              <Info className="size-4" />
            </button>
          </div>
        </div>
      )}
      {!hideActions && (
        <div className="flex gap-1.5">
          <Button
            type="button"
            className="flex-1"
            disabled={!canConfirm}
            onClick={onConfirm}
            aria-label={`Confirm ${label.toLowerCase()}`}
          >
            <Check className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label={`Remove ${label.toLowerCase()}`}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
      {feedback && (
        <p className={cn('text-xs', feedback.tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
          {feedback.note}
        </p>
      )}
      <RpeInfoDialog open={rpeInfoOpen} onOpenChange={setRpeInfoOpen} />
    </div>
  )
}

/** A finished set, collapsed to one line - tap to re-open for editing. */
export function SetSummaryRow({
  label,
  set,
  isPr,
  onEdit,
  onRemove,
  isUnilateral,
}: {
  label: string
  set: DraftSet
  isPr: PersonalRecordKind
  onEdit: () => void
  onRemove: () => void
  isUnilateral?: boolean
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-sm">
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className="text-muted-foreground">{label}</span>{' '}
        {isUnilateral ? (
          <>
            L {set.weight_left}×{set.reps_done_left}
            {set.rpe_left.trim() ? ` (${rpeLabel(Number(set.rpe_left))})` : ''} · R {set.weight_right}×
            {set.reps_done_right}
            {set.rpe_right.trim() ? ` (${rpeLabel(Number(set.rpe_right))})` : ''}
          </>
        ) : (
          <>
            {set.weight} × {set.reps_done}
            {set.rpe.trim() ? ` · ${rpeLabel(Number(set.rpe))}` : ''}
          </>
        )}
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
