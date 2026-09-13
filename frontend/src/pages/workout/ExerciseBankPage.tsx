import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import {
  createExerciseEditRequest,
  listExerciseEditRequests,
  listExercises,
  listMuscleGroups,
  resolveExerciseEditRequest,
} from '@/api/exercises'
import type { Exercise, ExerciseDifficulty, ExerciseEditRequest, MuscleGroup } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import MultiSelectDropdown from '@/components/MultiSelectDropdown'
import RequestEditDialog from '@/components/RequestEditDialog'
import AddExerciseDialog from './AddExerciseDialog'
import ExerciseCard from './ExerciseCard'

const DIFFICULTY_OPTIONS: { id: number; name: string; value: ExerciseDifficulty }[] = [
  { id: 1, name: 'Beginner', value: 'beginner' },
  { id: 2, name: 'Intermediate', value: 'intermediate' },
  { id: 3, name: 'Advanced', value: 'advanced' },
]
const DIFFICULTY_BY_ID = new Map(DIFFICULTY_OPTIONS.map((o) => [String(o.id), o.value]))

export default function ExerciseBankPage() {
  const { user } = useAuth()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  const [editRequests, setEditRequests] = useState<ExerciseEditRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([])
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [requestEditExercise, setRequestEditExercise] = useState<Exercise | null>(null)

  useEffect(() => {
    Promise.all([listExercises(), listMuscleGroups(), listExerciseEditRequests()])
      .then(([exerciseData, muscleGroupData, editRequestData]) => {
        setExercises(exerciseData)
        setMuscleGroups(muscleGroupData)
        setEditRequests(editRequestData)
        setError(false)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const editRequestsByExercise = useMemo(() => {
    const map = new Map<number, ExerciseEditRequest[]>()
    for (const req of editRequests) {
      const list = map.get(req.exercise)
      if (list) list.push(req)
      else map.set(req.exercise, [req])
    }
    return map
  }, [editRequests])

  async function handleRequestEditSubmit(description: string) {
    if (!requestEditExercise) return
    const created = await createExerciseEditRequest({ exercise: requestEditExercise.id, description })
    setEditRequests((prev) => [created, ...prev])
  }

  async function handleResolveRequest(id: number) {
    const updated = await resolveExerciseEditRequest(id)
    setEditRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
  }

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
    <div
      className="relative flex flex-col gap-3"
      style={{
        minHeight:
          'calc(100svh - var(--header-height) - 92px - var(--nav-height) - env(safe-area-inset-bottom))',
      }}
    >
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
              isTrainer={!!user?.is_trainer}
              editRequests={editRequestsByExercise.get(exercise.id) ?? []}
              onEdit={() => setEditingExercise(exercise)}
              onRequestEdit={() => setRequestEditExercise(exercise)}
              onResolveRequest={handleResolveRequest}
            />
          ))}
        </ul>
      )}

      {user?.is_trainer && (
        <>
          <Button
            type="button"
            size="icon-lg"
            className="fixed z-15 rounded-full shadow-lg"
            style={{ right: 16, bottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom) + 16px)' }}
            onClick={() => setAddOpen(true)}
            aria-label="Add exercise"
          >
            <Plus className="size-6" />
          </Button>

          <AddExerciseDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            muscleGroups={muscleGroups}
            onCreated={(exercise) => setExercises((prev) => [exercise, ...prev])}
          />

          <AddExerciseDialog
            open={editingExercise !== null}
            onOpenChange={(open) => !open && setEditingExercise(null)}
            muscleGroups={muscleGroups}
            exercise={editingExercise ?? undefined}
            onCreated={(exercise) => {
              setExercises((prev) => prev.map((e) => (e.id === exercise.id ? exercise : e)))
              setEditingExercise(null)
            }}
          />
        </>
      )}

      <RequestEditDialog
        open={requestEditExercise !== null}
        onOpenChange={(open) => !open && setRequestEditExercise(null)}
        itemName={requestEditExercise?.name ?? ''}
        onSubmit={handleRequestEditSubmit}
      />
    </div>
  )
}
