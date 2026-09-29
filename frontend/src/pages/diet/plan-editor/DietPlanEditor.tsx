import { Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  createDietPlan,
  createReferenceMeal,
  deleteDietPlan,
  getDietPlan,
  listDietPlans,
  publishDietPlan,
  startDietPlanEdit,
  updateDietPlan,
  updateReferenceMeal,
} from '@/api/dietPlan'
import type { DietPlanDetail, MealOptionDetail, Nutrients, ReferenceMealDetail } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import PlanVersionBar, { type PlanVersionView } from '@/components/plans/PlanVersionBar'
import DietPlanView from '../DietPlanView'
import PlanHistoryList from '../../trainer/PlanHistoryList'
import PlanNutritionSummary from './PlanNutritionSummary'
import ReferenceMealEditor from './ReferenceMealEditor'

const MEAL_SLOTS = ['Breakfast', 'Morning Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'Evening Snack']

/** Full create/edit/delete/reorder UI for a trainee's DietPlan -> ReferenceMeal
 * -> MealOption -> ReferenceMealItem, mirroring WorkoutPlanEditor's shape.
 * Only a draft/scheduled version is editable; the live one is shown
 * read-only (see PlanVersionBar / backend accounts/plan_versions.py). */
export default function DietPlanEditor({ traineeId }: { traineeId: number }) {
  // `plan` is the editable (draft/scheduled) version, `current` the live one.
  const [plan, setPlan] = useState<DietPlanDetail | null>(null)
  const [current, setCurrent] = useState<DietPlanDetail | null>(null)
  const [view, setView] = useState<PlanVersionView>('pending')
  const [loading, setLoading] = useState(true)
  const [planName, setPlanName] = useState('')
  const [savingPlan, setSavingPlan] = useState(false)
  // Which option each meal counts toward the daily total (mealId -> optionId);
  // a meal with no entry, or whose picked option was since deleted, falls
  // back to its first option.
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({})
  // Live nutrients of each open option's unsaved ingredient draft, so the
  // totals move as the trainer types amounts rather than only after saving.
  // An option with no entry (collapsed, never opened) uses its saved values.
  const [draftNutrients, setDraftNutrients] = useState<Record<number, Nutrients>>({})

  const handleDraftNutrients = useCallback((optionId: number, nutrients: Nutrients | null) => {
    setDraftNutrients((prev) => {
      const next = { ...prev }
      if (nutrients) next[optionId] = nutrients
      else delete next[optionId]
      return next
    })
  }, [])

  const nutrientsFor = (option: MealOptionDetail) => draftNutrients[option.id] ?? option.nutrients

  const selectedOptionFor = (meal: ReferenceMealDetail) =>
    meal.options.find((o) => o.id === selectedOptions[meal.id]) ?? meal.options[0] ?? null

  // Deliberately doesn't touch `loading` - this also runs after every edit
  // (add a meal/option, save ingredients, reorder, ...) via onChanged, and
  // swapping the whole tree for a "Loading…" placeholder on every one of
  // those would unmount every ReferenceMealEditor/MealOptionEditor, collapsing
  // whichever meal/option the trainer had open back down each time. Only the
  // very first load (below) needs the full-page loading state.
  async function reload() {
    const versions = await listDietPlans(traineeId)
    const pending = versions.find((v) => v.status === 'draft' || v.status === 'scheduled')
    const active = versions.find((v) => v.status === 'active')
    const [pendingDetail, activeDetail] = await Promise.all([
      pending ? getDietPlan(pending.id, traineeId) : null,
      active ? getDietPlan(active.id, traineeId) : null,
    ])
    setPlan(pendingDetail)
    setCurrent(activeDetail)
    if (pendingDetail) setPlanName(pendingDetail.name)
  }

  async function handleStartEdit() {
    await startDietPlanEdit(traineeId)
    await reload()
    setView('pending')
  }

  async function handlePublish(effectiveFrom: string) {
    if (!plan) return
    await publishDietPlan(plan.id, effectiveFrom)
    await reload()
    setView('pending')
  }

  async function handleDiscard() {
    if (!plan) return
    await deleteDietPlan(plan.id)
    await reload()
    setView('pending')
  }

  useEffect(() => {
    setLoading(true)
    reload().finally(() => setLoading(false))
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

      {(plan || current) && (
        <PlanVersionBar
          noun="diet plan"
          current={current}
          pending={plan}
          view={view}
          onViewChange={setView}
          onStartEdit={handleStartEdit}
          onPublish={handlePublish}
          onDiscard={handleDiscard}
        />
      )}

      {current && (!plan || view === 'current') ? (
        <DietPlanView plan={current} />
      ) : !plan ? (
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

          {plan.meals.length > 0 && (
            <PlanNutritionSummary
              meals={plan.meals}
              selectedOptionFor={selectedOptionFor}
              onSelectOption={(mealId, optionId) => setSelectedOptions((prev) => ({ ...prev, [mealId]: optionId }))}
              nutrientsFor={nutrientsFor}
            />
          )}

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
                selectedOption={selectedOptionFor(meal)}
                nutrientsFor={nutrientsFor}
                onDraftNutrients={handleDraftNutrients}
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
