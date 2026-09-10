import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createDietPlan, createReferenceMeal, getDietPlan, listDietPlans, updateDietPlan, updateReferenceMeal } from '@/api/dietPlan'
import type { DietPlanDetail } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import PlanHistoryList from '../../trainer/PlanHistoryList'
import ReferenceMealEditor from './ReferenceMealEditor'

const MEAL_SLOTS = ['Breakfast', 'Morning Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'Evening Snack']

/** Full create/edit/delete/reorder UI for a trainee's DietPlan -> ReferenceMeal
 * -> MealOption -> ReferenceMealItem, mirroring WorkoutPlanEditor's shape. */
export default function DietPlanEditor({ traineeId }: { traineeId: number }) {
  const [plan, setPlan] = useState<DietPlanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [planName, setPlanName] = useState('')
  const [savingPlan, setSavingPlan] = useState(false)

  function reload() {
    setLoading(true)
    listDietPlans(traineeId)
      .then((plans) => (plans.length ? getDietPlan(plans[0].id) : null))
      .then((detail) => {
        setPlan(detail)
        if (detail) setPlanName(detail.name)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traineeId])

  async function handleCreatePlan() {
    setSavingPlan(true)
    try {
      await createDietPlan({ trainee: traineeId, name: planName.trim() || 'Diet Plan' })
      reload()
    } finally {
      setSavingPlan(false)
    }
  }

  async function handleSavePlanName() {
    if (!plan) return
    setSavingPlan(true)
    try {
      await updateDietPlan(plan.id, { name: planName.trim() })
      reload()
    } finally {
      setSavingPlan(false)
    }
  }

  async function handleAddMeal(label: string) {
    if (!plan) return
    await createReferenceMeal({ diet_plan: plan.id, label, day_of_week: null, order: plan.meals.length })
    reload()
  }

  async function moveMeal(index: number, direction: -1 | 1) {
    if (!plan) return
    const target = plan.meals[index + direction]
    const current = plan.meals[index]
    if (!target) return
    await Promise.all([
      updateReferenceMeal(current.id, { order: target.order }),
      updateReferenceMeal(target.id, { order: current.order }),
    ])
    reload()
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  const usedSlots = new Set(plan?.meals.map((m) => m.label) ?? [])
  const availableSlots = MEAL_SLOTS.filter((slot) => !usedSlots.has(slot))

  return (
    <div className="flex flex-col gap-3">
      <PlanHistoryList traineeId={traineeId} planType="diet" />

      {!plan ? (
        <Card>
          <CardHeader>
            <CardTitle>No diet plan yet</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="new-diet-plan-name">Plan name</Label>
              <Input id="new-diet-plan-name" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="e.g. Reference Meal Plan" />
            </div>
            <Button type="button" size="sm" className="w-fit" disabled={savingPlan} onClick={handleCreatePlan}>
              {savingPlan ? 'Creating…' : 'Create diet plan'}
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
              <div className="flex flex-col gap-1">
                <Label htmlFor="diet-plan-name">Name</Label>
                <Input id="diet-plan-name" value={planName} onChange={(e) => setPlanName(e.target.value)} />
              </div>
              <Button type="button" size="sm" className="w-fit" disabled={savingPlan} onClick={handleSavePlanName}>
                {savingPlan ? 'Saving…' : 'Save'}
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            {plan.meals.map((meal, i) => (
              <ReferenceMealEditor
                key={meal.id}
                meal={meal}
                isFirst={i === 0}
                isLast={i === plan.meals.length - 1}
                onMoveUp={() => moveMeal(i, -1)}
                onMoveDown={() => moveMeal(i, 1)}
                onChanged={reload}
              />
            ))}
          </div>

          {availableSlots.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {availableSlots.map((slot) => (
                <Button key={slot} type="button" variant="outline" size="sm" onClick={() => handleAddMeal(slot)}>
                  <Plus className="size-4" />
                  {slot}
                </Button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
