import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { listExercises } from '@/api/exercises'
import {
  createPlanSession,
  createWorkoutPlan,
  getWorkoutPlan,
  listWorkoutPlans,
  updatePlanSession,
  updateWorkoutPlan,
} from '@/api/workoutPlans'
import type { Exercise, WorkoutPlanDetail } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import PlanHistoryList from '../PlanHistoryList'
import SessionEditor from './SessionEditor'

/** Full create/edit/delete/reorder UI for a trainee's WorkoutPlan -> PlanSession
 * -> PlanExercise, closing the long-standing "no trainer-side plan-authoring
 * UI" gap. The backend already permitted this (IsTrainerWriteTraineeReadOnly
 * on every level); this is purely the frontend build. */
export default function WorkoutPlanEditor({ traineeId }: { traineeId: number }) {
  const [plan, setPlan] = useState<WorkoutPlanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [planName, setPlanName] = useState('')
  const [sessionsPerWeek, setSessionsPerWeek] = useState('3')
  const [savingPlan, setSavingPlan] = useState(false)

  function reload() {
    setLoading(true)
    listWorkoutPlans(traineeId)
      .then((plans) => (plans.length ? getWorkoutPlan(plans[0].id) : null))
      .then((detail) => {
        setPlan(detail)
        if (detail) {
          setPlanName(detail.name)
          setSessionsPerWeek(String(detail.sessions_per_week))
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    listExercises()
      .then(setExercises)
      .catch(() => setExercises([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traineeId])

  async function handleCreatePlan() {
    setSavingPlan(true)
    try {
      await createWorkoutPlan({
        trainee: traineeId,
        name: planName.trim() || 'Workout Plan',
        sessions_per_week: Number(sessionsPerWeek) || 3,
      })
      reload()
    } finally {
      setSavingPlan(false)
    }
  }

  async function handleSavePlanDetails() {
    if (!plan) return
    setSavingPlan(true)
    try {
      await updateWorkoutPlan(plan.id, { name: planName.trim(), sessions_per_week: Number(sessionsPerWeek) || 1 })
      reload()
    } finally {
      setSavingPlan(false)
    }
  }

  async function handleAddSession() {
    if (!plan) return
    await createPlanSession({ plan: plan.id, label: `Session ${plan.sessions.length + 1}`, order: plan.sessions.length })
    reload()
  }

  async function moveSession(index: number, direction: -1 | 1) {
    if (!plan) return
    const target = plan.sessions[index + direction]
    const current = plan.sessions[index]
    if (!target) return
    await Promise.all([
      updatePlanSession(current.id, { order: target.order }),
      updatePlanSession(target.id, { order: current.order }),
    ])
    reload()
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <PlanHistoryList traineeId={traineeId} planType="workout" />

      {!plan ? (
        <Card>
          <CardHeader>
            <CardTitle>No workout plan yet</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="new-plan-name">Plan name</Label>
              <Input id="new-plan-name" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="e.g. Push/Pull/Legs" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="new-plan-frequency">Sessions per week</Label>
              <Input
                id="new-plan-frequency"
                type="number"
                inputMode="numeric"
                min="1"
                max="14"
                value={sessionsPerWeek}
                onChange={(e) => setSessionsPerWeek(e.target.value)}
                className="w-24"
              />
            </div>
            <Button type="button" size="sm" className="w-fit" disabled={savingPlan} onClick={handleCreatePlan}>
              {savingPlan ? 'Creating…' : 'Create workout plan'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Plan details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="plan-name">Name</Label>
                  <Input id="plan-name" value={planName} onChange={(e) => setPlanName(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="plan-frequency">Sessions/week</Label>
                  <Input
                    id="plan-frequency"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="14"
                    value={sessionsPerWeek}
                    onChange={(e) => setSessionsPerWeek(e.target.value)}
                  />
                </div>
              </div>
              <Button type="button" size="sm" className="w-fit" disabled={savingPlan} onClick={handleSavePlanDetails}>
                {savingPlan ? 'Saving…' : 'Save'}
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            {plan.sessions.map((session, i) => (
              <SessionEditor
                key={session.id}
                session={session}
                exercises={exercises}
                isFirst={i === 0}
                isLast={i === plan.sessions.length - 1}
                onMoveUp={() => moveSession(i, -1)}
                onMoveDown={() => moveSession(i, 1)}
                onChanged={reload}
              />
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={handleAddSession}>
            <Plus className="size-4" />
            Add session
          </Button>
        </>
      )}
    </div>
  )
}
