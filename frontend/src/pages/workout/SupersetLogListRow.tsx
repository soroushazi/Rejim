import { ChevronDown, ChevronUp, Info, Link2 } from 'lucide-react'
import { useState } from 'react'
import type { Exercise, MuscleGroup, PlanExerciseDetail } from '@/api/types'
import { Button } from '@/components/ui/button'
import ExerciseDetailDialog from './ExerciseDetailDialog'

type Props = {
  planExerciseA: PlanExerciseDetail
  planExerciseB: PlanExerciseDetail
  exerciseA: Exercise | null
  exerciseB: Exercise | null
  exercisesById: Map<number, Exercise>
  muscleGroups: MuscleGroup[]
  confirmedRounds: number
  targetRounds: number
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  reordering: boolean
  onLog: () => void
}

/** A superset pair's collapsed row in the session overview list - mirrors
 * ExerciseLogListRow but for two exercises, with a single "Log exercises"
 * button that opens SessionLogForm's full-screen logging view for the pair. */
export default function SupersetLogListRow({
  planExerciseA,
  planExerciseB,
  exerciseA,
  exerciseB,
  exercisesById,
  muscleGroups,
  confirmedRounds,
  targetRounds,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  reordering,
  onLog,
}: Props) {
  const [detailsFor, setDetailsFor] = useState<0 | 1 | null>(null)

  return (
    <div className="overflow-hidden rounded-lg border border-primary/30">
      <div className="flex items-center gap-0.5 bg-primary/5 px-3 py-2.5">
        <Link2 className="size-3.5 shrink-0 text-primary" />
        <div className="flex min-w-0 shrink flex-col leading-tight">
          <span className="flex min-w-0 items-center gap-1 truncate text-sm font-medium">
            <span className="min-w-0 truncate">{planExerciseA.exercise_name}</span>
            <button
              type="button"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setDetailsFor(0)}
              aria-label={`View details for ${planExerciseA.exercise_name}`}
            >
              <Info className="size-3.5" />
            </button>
          </span>
          <span className="flex min-w-0 items-center gap-1 truncate text-sm font-medium">
            <span className="min-w-0 truncate">+ {planExerciseB.exercise_name}</span>
            <button
              type="button"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setDetailsFor(1)}
              aria-label={`View details for ${planExerciseB.exercise_name}`}
            >
              <Info className="size-3.5" />
            </button>
          </span>
        </div>
        <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
          {confirmedRounds}/{targetRounds} rounds
        </span>
        {reordering && (
          <>
            <Button type="button" variant="ghost" size="icon-sm" disabled={!canMoveUp} onClick={onMoveUp} aria-label="Move superset earlier">
              <ChevronUp className="size-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" disabled={!canMoveDown} onClick={onMoveDown} aria-label="Move superset later">
              <ChevronDown className="size-4" />
            </Button>
          </>
        )}
      </div>

      {!reordering && (
        <div className="border-t border-border p-2">
          <Button type="button" size="sm" className="w-full" onClick={onLog}>
            Log exercises
          </Button>
        </div>
      )}

      <ExerciseDetailDialog
        exercise={detailsFor === 0 ? exerciseA : detailsFor === 1 ? exerciseB : null}
        exercisesById={exercisesById}
        muscleGroups={muscleGroups}
        onOpenChange={(open) => !open && setDetailsFor(null)}
      />
    </div>
  )
}
