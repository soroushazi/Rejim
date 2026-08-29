import { useState } from 'react'
import type { Exercise, ExerciseDifficulty, MuscleGroup } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import MuscleDiagram from './MuscleDiagram'

const DIFFICULTY_LABEL: Record<ExerciseDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

const DIFFICULTY_BADGE_VARIANT: Record<ExerciseDifficulty, 'secondary' | 'outline' | 'default'> = {
  beginner: 'secondary',
  intermediate: 'outline',
  advanced: 'default',
}

export default function ExerciseCard({
  exercise,
  muscleGroups,
  exercisesById,
}: {
  exercise: Exercise
  muscleGroups: MuscleGroup[]
  exercisesById: Map<number, Exercise>
}) {
  const [expanded, setExpanded] = useState(false)

  const muscleGroupsById = new Map(muscleGroups.map((m) => [m.id, m.name]))
  const primaryNames = exercise.primary_muscle_groups.map((id) => muscleGroupsById.get(id)).filter((n): n is string => !!n)
  const secondaryNames = exercise.secondary_muscle_groups
    .map((id) => muscleGroupsById.get(id))
    .filter((n): n is string => !!n)
  const alternatives = exercise.alternatives.map((id) => exercisesById.get(id)).filter((e): e is Exercise => !!e)

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full flex-col gap-1.5 px-3.5 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">{exercise.name}</span>
          <Badge variant={DIFFICULTY_BADGE_VARIANT[exercise.difficulty_level]} className="font-normal">
            {DIFFICULTY_LABEL[exercise.difficulty_level]}
          </Badge>
        </div>
        {primaryNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {primaryNames.map((name) => (
              <Badge key={name} variant="secondary" className="font-normal">
                {name}
              </Badge>
            ))}
          </div>
        )}
        {exercise.equipment && <span className="text-xs text-muted-foreground">{exercise.equipment}</span>}
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-border px-3.5 py-3">
          {exercise.description && <p className="text-sm text-muted-foreground">{exercise.description}</p>}

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

          {alternatives.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Alternatives</p>
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
    </li>
  )
}
