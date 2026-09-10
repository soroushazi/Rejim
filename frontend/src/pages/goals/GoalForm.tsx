import { useState } from 'react'
import type { Exercise, Goal, GoalDirection, GoalType, NewGoal, WeightUnit } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  exercises: Exercise[]
  initial: Goal | null
  onSave: (data: NewGoal) => Promise<void>
}

type FormState = {
  goal_type: GoalType
  target_weight: string
  target_weight_unit: WeightUnit
  direction: GoalDirection
  exercise: string
  target_value: string
  target_value_unit: WeightUnit
  target_date: string
}

function toFormState(goal: Goal | null): FormState {
  return {
    goal_type: goal?.goal_type ?? 'weight',
    target_weight: goal?.target_weight ?? '',
    target_weight_unit: goal?.target_weight_unit ?? 'kg',
    direction: goal?.direction ?? 'lose',
    exercise: goal?.exercise ? String(goal.exercise) : '',
    target_value: goal?.target_value ?? '',
    target_value_unit: goal?.target_value_unit ?? 'kg',
    target_date: goal?.target_date ?? '',
  }
}

export default function GoalForm({ open, onOpenChange, exercises, initial, onSave }: Props) {
  const [form, setForm] = useState<FormState>(() => toFormState(initial))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleOpenChange(next: boolean) {
    if (next) setForm(toFormState(initial))
    onOpenChange(next)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const data: NewGoal =
        form.goal_type === 'weight'
          ? {
              goal_type: 'weight',
              target_weight: form.target_weight,
              target_weight_unit: form.target_weight_unit,
              direction: form.direction,
              target_date: form.target_date || null,
            }
          : {
              goal_type: 'strength',
              exercise: form.exercise ? Number(form.exercise) : null,
              target_value: form.target_value,
              target_value_unit: form.target_value_unit,
              target_date: form.target_date || null,
            }
      await onSave(data)
      onOpenChange(false)
    } catch {
      setError('Could not save. Check that all required fields are filled in.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit goal' : 'New goal'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label>Goal type</Label>
            <ToggleGroup
              type="single"
              value={form.goal_type}
              onValueChange={(v) => v && update('goal_type', v as GoalType)}
              variant="outline"
              className="w-full"
            >
              <ToggleGroupItem value="weight" className="flex-1">
                Weight
              </ToggleGroupItem>
              <ToggleGroupItem value="strength" className="flex-1">
                Strength
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {form.goal_type === 'weight' ? (
            <>
              <div className="flex flex-col gap-1">
                <Label htmlFor="goal-target-weight">Target weight</Label>
                <div className="flex gap-1.5">
                  <Input
                    id="goal-target-weight"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    value={form.target_weight}
                    onChange={(e) => update('target_weight', e.target.value)}
                  />
                  <Select value={form.target_weight_unit} onValueChange={(v) => update('target_weight_unit', v as WeightUnit)}>
                    <SelectTrigger className="w-16 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="lb">lb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Direction</Label>
                <ToggleGroup
                  type="single"
                  value={form.direction}
                  onValueChange={(v) => v && update('direction', v as GoalDirection)}
                  variant="outline"
                  className="w-full"
                >
                  <ToggleGroupItem value="lose" className="flex-1">
                    Lose
                  </ToggleGroupItem>
                  <ToggleGroupItem value="gain" className="flex-1">
                    Gain
                  </ToggleGroupItem>
                  <ToggleGroupItem value="maintain" className="flex-1">
                    Maintain
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <Label htmlFor="goal-exercise">Exercise</Label>
                <Select value={form.exercise} onValueChange={(v) => update('exercise', v)}>
                  <SelectTrigger id="goal-exercise" className="w-full">
                    <SelectValue placeholder="Pick an exercise…" />
                  </SelectTrigger>
                  <SelectContent>
                    {exercises.map((ex) => (
                      <SelectItem key={ex.id} value={String(ex.id)}>
                        {ex.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="goal-target-value">Target weight</Label>
                <div className="flex gap-1.5">
                  <Input
                    id="goal-target-value"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    value={form.target_value}
                    onChange={(e) => update('target_value', e.target.value)}
                  />
                  <Select value={form.target_value_unit} onValueChange={(v) => update('target_value_unit', v as WeightUnit)}>
                    <SelectTrigger className="w-16 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="lb">lb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col gap-1">
            <Label htmlFor="goal-target-date">Target date (optional)</Label>
            <Input
              id="goal-target-date"
              type="date"
              value={form.target_date}
              onChange={(e) => update('target_date', e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
