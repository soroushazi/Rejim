import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createGoal, deleteGoal, listGoals, updateGoal } from '@/api/goals'
import { listExercises } from '@/api/exercises'
import type { Exercise, Goal, GoalDirection, NewGoal, WeightUnit } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

/** A compact, embedded goal-capture surface for onboarding - reuses the same
 * Goal CRUD API as the full /goals page, but deliberately simpler (no dialog,
 * no editing an existing strength goal in place - just add/remove). Fine-
 * tuning an existing goal stays on the dedicated Goals page. */
export default function GoalsOnboardingCard() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)

  const [weightGoalId, setWeightGoalId] = useState<number | null>(null)
  const [targetWeight, setTargetWeight] = useState('')
  const [targetWeightUnit, setTargetWeightUnit] = useState<WeightUnit>('kg')
  const [direction, setDirection] = useState<GoalDirection>('lose')
  const [savingWeight, setSavingWeight] = useState(false)
  const [savedWeight, setSavedWeight] = useState(false)

  const [strengthGoals, setStrengthGoals] = useState<Goal[]>([])
  const [addingStrength, setAddingStrength] = useState(false)
  const [newExercise, setNewExercise] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newValueUnit, setNewValueUnit] = useState<WeightUnit>('kg')
  const [savingStrength, setSavingStrength] = useState(false)

  function reload() {
    setLoading(true)
    listGoals()
      .then((all) => {
        const weightGoal = all.find((g) => g.goal_type === 'weight' && g.is_active)
        if (weightGoal) {
          setWeightGoalId(weightGoal.id)
          setTargetWeight(weightGoal.target_weight ?? '')
          setTargetWeightUnit(weightGoal.target_weight_unit ?? 'kg')
          setDirection(weightGoal.direction ?? 'lose')
        }
        setStrengthGoals(all.filter((g) => g.goal_type === 'strength' && g.is_active))
      })
      .catch(() => {
        setStrengthGoals([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    listExercises()
      .then(setExercises)
      .catch(() => setExercises([]))
  }, [])

  async function saveWeightGoal() {
    if (!targetWeight.trim()) return
    setSavingWeight(true)
    try {
      const data: NewGoal = {
        goal_type: 'weight',
        target_weight: targetWeight.trim(),
        target_weight_unit: targetWeightUnit,
        direction,
      }
      if (weightGoalId) await updateGoal(weightGoalId, data)
      else {
        const created = await createGoal(data)
        setWeightGoalId(created.id)
      }
      setSavedWeight(true)
    } finally {
      setSavingWeight(false)
    }
  }

  async function addStrengthGoal() {
    if (!newExercise || !newValue.trim()) return
    setSavingStrength(true)
    try {
      await createGoal({
        goal_type: 'strength',
        exercise: Number(newExercise),
        target_value: newValue.trim(),
        target_value_unit: newValueUnit,
      })
      setNewExercise('')
      setNewValue('')
      setAddingStrength(false)
      reload()
    } finally {
      setSavingStrength(false)
    }
  }

  async function removeStrengthGoal(id: number) {
    await deleteGoal(id)
    reload()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Goals</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Weight goal</Label>
              <div className="flex flex-wrap items-center gap-1.5">
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  placeholder="Target"
                  className="w-24"
                  value={targetWeight}
                  onChange={(e) => {
                    setTargetWeight(e.target.value)
                    setSavedWeight(false)
                  }}
                />
                <Select
                  value={targetWeightUnit}
                  onValueChange={(v) => {
                    setTargetWeightUnit(v as WeightUnit)
                    setSavedWeight(false)
                  }}
                >
                  <SelectTrigger className="w-16 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="lb">lb</SelectItem>
                  </SelectContent>
                </Select>
                <ToggleGroup
                  type="single"
                  value={direction}
                  onValueChange={(v) => {
                    if (!v) return
                    setDirection(v as GoalDirection)
                    setSavedWeight(false)
                  }}
                  variant="outline"
                  size="sm"
                >
                  <ToggleGroupItem value="lose">Lose</ToggleGroupItem>
                  <ToggleGroupItem value="gain">Gain</ToggleGroupItem>
                  <ToggleGroupItem value="maintain">Maintain</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" disabled={savingWeight || !targetWeight.trim()} onClick={saveWeightGoal}>
                  {savingWeight ? 'Saving…' : 'Save'}
                </Button>
                {savedWeight && <span className="text-sm text-muted-foreground">Saved</span>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 border-t border-border pt-3">
              <Label>Strength goals</Label>
              {strengthGoals.length === 0 && !addingStrength && (
                <p className="text-sm text-muted-foreground">No strength goals yet.</p>
              )}
              {strengthGoals.map((g) => (
                <div key={g.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm">
                  <span>
                    {exercises.find((e) => e.id === g.exercise)?.name ?? 'Exercise'}: {g.target_value}
                    {g.target_value_unit}
                  </span>
                  <button type="button" onClick={() => removeStrengthGoal(g.id)} aria-label="Remove">
                    <Trash2 className="size-4 text-destructive" />
                  </button>
                </div>
              ))}

              {addingStrength ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Select value={newExercise} onValueChange={setNewExercise}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Exercise…" />
                    </SelectTrigger>
                    <SelectContent>
                      {exercises.map((ex) => (
                        <SelectItem key={ex.id} value={String(ex.id)}>
                          {ex.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    placeholder="Target"
                    className="w-24"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                  />
                  <Select value={newValueUnit} onValueChange={(v) => setNewValueUnit(v as WeightUnit)}>
                    <SelectTrigger className="w-16 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="lb">lb</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingStrength || !newExercise || !newValue.trim()}
                    onClick={addStrengthGoal}
                  >
                    {savingStrength ? 'Adding…' : 'Add'}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setAddingStrength(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button type="button" size="sm" variant="outline" className="w-fit" onClick={() => setAddingStrength(true)}>
                  <Plus className="size-4" />
                  Add strength goal
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
