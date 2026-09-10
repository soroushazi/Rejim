import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createGoal, deleteGoal, listGoals, updateGoal } from '@/api/goals'
import { listExercises } from '@/api/exercises'
import type { Exercise, Goal, NewGoal } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { useTraineeId } from '@/lib/useTraineeId'
import GoalCard from './goals/GoalCard'
import GoalForm from './goals/GoalForm'

export default function GoalsPage() {
  const { user } = useAuth()
  const canEdit = user?.role === 'trainee'
  const { traineeId, picker, ready } = useTraineeId()

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
    if (!ready) return
    setLoading(true)
    listGoals(traineeId)
      .then(setGoals)
      .catch(() => setGoals([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, traineeId])

  async function handleSave(data: NewGoal) {
    if (editing) await updateGoal(editing.id, data)
    else await createGoal(data)
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

  if (!ready) {
    return picker ?? <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Goals</h1>
        {canEdit && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            New goal
          </Button>
        )}
      </div>
      {picker}

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
