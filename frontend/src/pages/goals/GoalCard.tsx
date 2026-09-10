import { Trash2 } from 'lucide-react'
import type { Exercise, Goal } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type Props = {
  goal: Goal
  exercises: Exercise[]
  canEdit: boolean
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
}

export default function GoalCard({ goal, exercises, canEdit, onEdit, onToggleActive, onDelete }: Props) {
  const exerciseName = goal.exercise ? exercises.find((e) => e.id === goal.exercise)?.name : null

  const summary =
    goal.goal_type === 'weight'
      ? `${goal.direction === 'lose' ? 'Lose to' : goal.direction === 'gain' ? 'Gain to' : 'Maintain'} ${goal.target_weight}${goal.target_weight_unit}`
      : `${exerciseName ?? 'Exercise'}: ${goal.target_value}${goal.target_value_unit}`

  return (
    <Card className={!goal.is_active ? 'opacity-60' : undefined}>
      <CardContent className="flex items-center gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {goal.goal_type}
            </Badge>
            {!goal.is_active && <Badge variant="outline">Archived</Badge>}
          </div>
          <button
            type="button"
            className="w-fit text-left font-medium disabled:cursor-default"
            disabled={!canEdit}
            onClick={onEdit}
          >
            {summary}
          </button>
          {goal.target_date && <span className="text-xs text-muted-foreground">Target date: {goal.target_date}</span>}
        </div>
        {canEdit && (
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={onToggleActive}>
              {goal.is_active ? 'Archive' : 'Unarchive'}
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
