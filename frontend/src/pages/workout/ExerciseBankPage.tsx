import { useEffect, useMemo, useState } from 'react'
import { listExercises, listMuscleGroups } from '@/api/exercises'
import type { Exercise, ExerciseDifficulty, MuscleGroup } from '@/api/types'
import { Input } from '@/components/ui/input'
import MultiSelectDropdown from '@/components/MultiSelectDropdown'
import ExerciseCard from './ExerciseCard'

const DIFFICULTY_OPTIONS: { id: number; name: string; value: ExerciseDifficulty }[] = [
  { id: 1, name: 'Beginner', value: 'beginner' },
  { id: 2, name: 'Intermediate', value: 'intermediate' },
  { id: 3, name: 'Advanced', value: 'advanced' },
]
const DIFFICULTY_BY_ID = new Map(DIFFICULTY_OPTIONS.map((o) => [String(o.id), o.value]))

export default function ExerciseBankPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([])
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([])

  useEffect(() => {
    Promise.all([listExercises(), listMuscleGroups()])
      .then(([exerciseData, muscleGroupData]) => {
        setExercises(exerciseData)
        setMuscleGroups(muscleGroupData)
        setError(false)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const muscleIds = selectedMuscles.map(Number)
    const difficulties = selectedDifficulties.map((id) => DIFFICULTY_BY_ID.get(id))
    return exercises.filter((e) => {
      if (query && !e.name.toLowerCase().includes(query)) return false
      if (
        muscleIds.length > 0 &&
        !muscleIds.some((id) => e.primary_muscle_groups.includes(id) || e.secondary_muscle_groups.includes(id))
      )
        return false
      if (difficulties.length > 0 && !difficulties.includes(e.difficulty_level)) return false
      return true
    })
  }, [exercises, search, selectedMuscles, selectedDifficulties])

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        placeholder="Search exercise bank…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="rounded-full"
      />

      <div className="flex gap-2">
        <MultiSelectDropdown
          label="Muscle"
          options={muscleGroups}
          selected={selectedMuscles}
          onChange={setSelectedMuscles}
          className="flex-1"
          searchable
        />
        <MultiSelectDropdown
          label="Difficulty"
          options={DIFFICULTY_OPTIONS}
          selected={selectedDifficulties}
          onChange={setSelectedDifficulties}
          className="flex-1"
        />
      </div>

      {loading && <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>}
      {!loading && error && (
        <p className="mt-6 text-center text-sm text-muted-foreground">Couldn't load the exercise bank.</p>
      )}
      {!loading && !error && filtered.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">No exercises found.</p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <ul className="flex flex-col gap-2">
          {filtered.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              muscleGroups={muscleGroups}
              exercisesById={exercisesById}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
