import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createGoal, deleteGoal, listGoals, updateGoal } from '@/api/goals'
import { listExercises } from '@/api/exercises'
import type { Exercise, Goal, NewGoal } from '@/api/types'
import { Button } from '@/components/ui/button'
import GoalCard from './GoalCard'
import GoalForm from './GoalForm'

type Props = {
  /** undefined = "my own goals" (a trainee viewing themselves). Set when a
   * trainer is viewing/editing one specific trainee's goals. */
  traineeId?: number
  canEdit: boolean
}

/** The list+dialog body shared by GoalsPage (wraps this with the trainee-
 * picker) and TraineeDetailPage's Goals section (passes the already-known
 * traineeId, no picker needed). */
export default function GoalsSection({ traineeId, canEdit }: Props) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)

  useEffect(() => {
    listExercises()
      .then(setExercises)
      .catch(() => setExercises([]))
  }, [])

  function reload() {
    setLoading(true)
    listGoals(traineeId)
      .then(setGoals)
      .catch(() => setGoals([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traineeId])

  async function handleSave(data: NewGoal) {
    if (editing) await updateGoal(editing.id, data)
    else await createGoal(traineeId ? { ...data, trainee: traineeId } : data)
    reload()
  }

  async function handleToggleActive(goal: Goal) {
    await updateGoal(goal.id, { is_active: !goal.is_active })
    reload()
  }

  async function handleDelete(goal: Goal) {
    if (!window.confirm('Delete this goal? This cannot be undone.')) return
    await deleteGoal(goal.id)
    reload()
  }

  return (
    <div className="flex flex-col gap-3">
      {canEdit && (
        <Button
          type="button"
          size="sm"
          className="w-fit"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" />
          New goal
        </Button>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No goals yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              exercises={exercises}
              canEdit={canEdit}
              onEdit={() => {
                setEditing(goal)
                setFormOpen(true)
              }}
              onToggleActive={() => handleToggleActive(goal)}
              onDelete={() => handleDelete(goal)}
            />
          ))}
        </div>
      )}

      {canEdit && (
        <GoalForm open={formOpen} onOpenChange={setFormOpen} exercises={exercises} initial={editing} onSave={handleSave} />
      )}
    </div>
  )
}
