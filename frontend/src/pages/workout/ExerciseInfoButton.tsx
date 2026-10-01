import { Info } from 'lucide-react'
import { useState } from 'react'
import type { Exercise, MuscleGroup } from '@/api/types'
import ExerciseDetailDialog from './ExerciseDetailDialog'

/** The ⓘ next to an exercise's name while logging - opens ExerciseDetailDialog
 * (description, video, muscle diagram). Shared by the session overview rows and
 * the full-screen "Log exercise(s)" view, so it's reachable both before and
 * while actually logging. Sized larger than a plain inline icon (with its own
 * padded hit area) since it's a real tap target on a phone mid-workout. */
export default function ExerciseInfoButton({
  name,
  exercise,
  exercisesById,
  muscleGroups,
}: {
  name: string
  exercise: Exercise | null
  exercisesById: Map<number, Exercise>
  muscleGroups: MuscleGroup[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="-my-1 shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
        aria-label={`View details for ${name}`}
      >
        <Info className="size-5" />
      </button>
      <ExerciseDetailDialog
        exercise={open ? exercise : null}
        exercisesById={exercisesById}
        muscleGroups={muscleGroups}
        onOpenChange={setOpen}
      />
    </>
  )
}
