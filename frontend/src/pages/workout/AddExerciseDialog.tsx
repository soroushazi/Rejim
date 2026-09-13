import { useEffect, useState, type FormEvent } from 'react'
import { createExercise, updateExercise } from '@/api/exercises'
import type { Exercise, ExerciseDifficulty, MuscleGroup } from '@/api/types'
import MultiSelectDropdown from '@/components/MultiSelectDropdown'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import MuscleDiagram from './MuscleDiagram'

type AddExerciseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (exercise: Exercise) => void
  muscleGroups: MuscleGroup[]
  // Set to edit an existing exercise in place instead of creating a new one.
  exercise?: Exercise
}

const DIFFICULTY_OPTIONS: { value: ExerciseDifficulty; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

export default function AddExerciseDialog({
  open,
  onOpenChange,
  onCreated,
  muscleGroups,
  exercise,
}: AddExerciseDialogProps) {
  const isEditing = exercise !== undefined
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [equipment, setEquipment] = useState('')
  const [difficulty, setDifficulty] = useState<ExerciseDifficulty>('beginner')
  const [primaryMuscles, setPrimaryMuscles] = useState<string[]>([])
  const [secondaryMuscles, setSecondaryMuscles] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName('')
    setDescription('')
    setEquipment('')
    setDifficulty('beginner')
    setPrimaryMuscles([])
    setSecondaryMuscles([])
    setVideoUrl('')
    setError(null)
  }

  useEffect(() => {
    if (!open) return
    if (exercise) {
      setName(exercise.name)
      setDescription(exercise.description)
      setEquipment(exercise.equipment)
      setDifficulty(exercise.difficulty_level)
      setPrimaryMuscles(exercise.primary_muscle_groups.map(String))
      setSecondaryMuscles(exercise.secondary_muscle_groups.map(String))
      setVideoUrl(exercise.video_url ?? '')
    } else {
      reset()
    }
    setError(null)
  }, [open, exercise])

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  const muscleGroupsById = new Map(muscleGroups.map((m) => [m.id, m.name]))
  const primaryNames = primaryMuscles.map((id) => muscleGroupsById.get(Number(id))).filter((n): n is string => !!n)
  const secondaryNames = secondaryMuscles
    .map((id) => muscleGroupsById.get(Number(id)))
    .filter((n): n is string => !!n)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Name is required.')
      return
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      equipment: equipment.trim(),
      difficulty_level: difficulty,
      primary_muscle_groups: primaryMuscles.map(Number),
      secondary_muscle_groups: secondaryMuscles.map(Number),
      video_url: videoUrl.trim() || null,
    }

    setSubmitting(true)
    try {
      const saved = isEditing ? await updateExercise(exercise.id, payload) : await createExercise(payload)
      onCreated(saved)
      handleOpenChange(false)
    } catch {
      setError('Could not save this exercise. Check the values and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit exercise' : 'Add exercise'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exercise-name">Name</Label>
            <Input id="exercise-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exercise-description">Description</Label>
            <Textarea
              id="exercise-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exercise-equipment">Equipment</Label>
            <Input
              id="exercise-equipment"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="e.g. Barbell"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Difficulty</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={difficulty}
              onValueChange={(v) => v && setDifficulty(v as ExerciseDifficulty)}
              className="w-full"
            >
              {DIFFICULTY_OPTIONS.map((opt) => (
                <ToggleGroupItem key={opt.value} value={opt.value} className="flex-1">
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="flex gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label>Primary muscles</Label>
              <MultiSelectDropdown
                label="Primary"
                options={muscleGroups}
                selected={primaryMuscles}
                onChange={setPrimaryMuscles}
                searchable
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label>Secondary muscles</Label>
              <MultiSelectDropdown
                label="Secondary"
                options={muscleGroups}
                selected={secondaryMuscles}
                onChange={setSecondaryMuscles}
                searchable
              />
            </div>
          </div>

          {(primaryNames.length > 0 || secondaryNames.length > 0) && (
            <div className="flex justify-center gap-4 rounded-lg border border-border bg-muted/30 py-3">
              <MuscleDiagram primaryMuscles={primaryNames} secondaryMuscles={secondaryNames} type="anterior" />
              <MuscleDiagram primaryMuscles={primaryNames} secondaryMuscles={secondaryNames} type="posterior" />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exercise-video-url">Video URL</Label>
            <Input
              id="exercise-video-url"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Save exercise'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
