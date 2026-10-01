import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Exercise, MuscleGroup, PlanExerciseDetail } from '@/api/types'
import { Button } from '@/components/ui/button'
import ExerciseInfoButton from './ExerciseInfoButton'

type Props = {
  planExercise: PlanExerciseDetail
  exercise: Exercise | null
  exercisesById: Map<number, Exercise>
  muscleGroups: MuscleGroup[]
  confirmedWorkingCount: number
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  reordering: boolean
  onLog: () => void
}

/** One exercise's collapsed row in the session overview list - a summary plus
 * a "Log exercise" button that opens SessionLogForm's full-screen logging
 * view for it, rather than expanding inline (see ExerciseLogBlock). */
export default function ExerciseLogListRow({
  planExercise,
  exercise,
  exercisesById,
  muscleGroups,
  confirmedWorkingCount,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  reordering,
  onLog,
}: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <span className="min-w-0 shrink truncate font-medium">{planExercise.exercise_name}</span>
        <ExerciseInfoButton
          name={planExercise.exercise_name}
          exercise={exercise}
          exercisesById={exercisesById}
          muscleGroups={muscleGroups}
        />
        <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
          {confirmedWorkingCount}/{planExercise.target_sets} sets · {planExercise.target_reps_min}-
          {planExercise.target_reps_max} reps
        </span>
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

      {!reordering && (
        <div className="border-t border-border p-2">
          <Button type="button" size="sm" className="w-full" onClick={onLog}>
            Log exercise
          </Button>
        </div>
      )}
    </div>
  )
}
