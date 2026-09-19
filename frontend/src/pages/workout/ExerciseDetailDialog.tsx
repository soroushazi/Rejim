import { ExternalLink } from 'lucide-react'
import type { Exercise, MuscleGroup } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DIFFICULTY_BADGE_VARIANT, DIFFICULTY_LABEL } from '@/lib/exerciseDifficulty'
import MuscleDiagram from './MuscleDiagram'

type Props = {
  exercise: Exercise | null
  muscleGroups: MuscleGroup[]
  exercisesById: Map<number, Exercise>
  onOpenChange: (open: boolean) => void
}

export default function ExerciseDetailDialog({ exercise, muscleGroups, exercisesById, onOpenChange }: Props) {
  const muscleGroupsById = new Map(muscleGroups.map((m) => [m.id, m.name]))
  const primaryNames = exercise
    ? exercise.primary_muscle_groups.map((id) => muscleGroupsById.get(id)).filter((n): n is string => !!n)
    : []
  const secondaryNames = exercise
    ? exercise.secondary_muscle_groups.map((id) => muscleGroupsById.get(id)).filter((n): n is string => !!n)
    : []
  const alternatives = exercise
    ? exercise.alternatives.map((id) => exercisesById.get(id)).filter((e): e is Exercise => !!e)
    : []

  return (
    <Dialog open={exercise !== null} onOpenChange={(next) => !next && onOpenChange(false)}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{exercise?.name}</DialogTitle>
        </DialogHeader>

        {exercise && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={DIFFICULTY_BADGE_VARIANT[exercise.difficulty_level]} className="font-normal">
                {DIFFICULTY_LABEL[exercise.difficulty_level]}
              </Badge>
              {exercise.is_unilateral && (
                <Badge variant="outline" className="font-normal">
                  Per side
                </Badge>
              )}
              {exercise.equipment && <span className="text-xs text-muted-foreground">{exercise.equipment}</span>}
            </div>

            {exercise.description && <p className="text-sm text-muted-foreground">{exercise.description}</p>}

            {exercise.video_url && (
              <a
                href={exercise.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Watch video <ExternalLink className="size-3.5" />
              </a>
            )}

            {(primaryNames.length > 0 || secondaryNames.length > 0) && (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                {primaryNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {primaryNames.map((name) => (
                      <Badge key={name} variant="secondary" className="font-normal">
                        {name}
                      </Badge>
                    ))}
                  </div>
                )}
                {secondaryNames.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs text-muted-foreground">Also works</p>
                    <div className="flex flex-wrap gap-1.5">
                      {secondaryNames.map((name) => (
                        <Badge key={name} variant="outline" className="font-normal">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-center gap-4">
                  <MuscleDiagram primaryMuscles={primaryNames} secondaryMuscles={secondaryNames} type="anterior" />
                  <MuscleDiagram primaryMuscles={primaryNames} secondaryMuscles={secondaryNames} type="posterior" />
                </div>
              </div>
            )}

            {alternatives.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Similar exercises</p>
                <ul className="flex flex-col overflow-hidden rounded-lg border border-border">
                  {alternatives.map((alt) => (
                    <li key={alt.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{alt.name}</span>
                      <Badge variant={DIFFICULTY_BADGE_VARIANT[alt.difficulty_level]} className="font-normal">
                        {DIFFICULTY_LABEL[alt.difficulty_level]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
