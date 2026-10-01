import { useEffect, useState, type FormEvent } from 'react'
import type { NewQuickLogItem, Nutrients } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { round } from '@/lib/utils'
import CollapsibleSection from '@/components/CollapsibleSection'
import IngredientPicker, { ingredientsTotal, type DraftComponent } from './IngredientPicker'

type Props = {
  onAdd: (name: string, nutrients: Nutrients) => void
  // Fires when the trainee picks "head to saved meals" instead - hands over
  // whatever's currently typed here so it isn't lost, and the form clears in
  // favor of AddQuickLogItemDialog (see LogMealPage's handleMoveToQuickLog).
  onMoveToQuickLog: (draft: NewQuickLogItem) => void
}

const MACRO_FIELDS: { key: keyof Nutrients; label: string }[] = [
  { key: 'protein_g', label: 'Protein (g)' },
  { key: 'carbs_g', label: 'Carbs (g)' },
  { key: 'fat_g', label: 'Fat (g)' },
]

const MICRO_FIELDS: { key: keyof Nutrients; label: string }[] = [
  { key: 'fiber_g', label: 'Fiber (g)' },
  { key: 'sugar_g', label: 'Sugar (g)' },
  { key: 'sodium_mg', label: 'Sodium (mg)' },
  { key: 'potassium_mg', label: 'Potassium (mg)' },
  { key: 'calcium_mg', label: 'Calcium (mg)' },
  { key: 'iron_mg', label: 'Iron (mg)' },
  { key: 'vitamin_c_mg', label: 'Vitamin C (mg)' },
  { key: 'vitamin_a_mcg', label: 'Vitamin A (mcg)' },
]

const EMPTY_VALUES = Object.fromEntries(
  [...MACRO_FIELDS, ...MICRO_FIELDS].map(({ key }) => [key, '']),
) as Record<string, string>

/** A one-time, typed-in estimate for something eaten today that has no
 * sensible backing item - e.g. "Stew" at a party, where a rough guess is all
 * that's possible and the same dish could get a totally different estimate
 * next time. Unlike a QuickLogItem ("my protein shake"), nothing here is
 * saved for reuse - this just appends one row straight to the cart with
 * whatever values were typed in (or computed from ingredients, below). See
 * backend FoodLog.custom_name.
 *
 * The optional "Enter ingredients" card is a calculator, not a second source
 * of truth: picking single-ingredient amounts (e.g. 100g ground beef, 50g
 * tomato) from the Food Bank auto-fills the calorie/macro/micro fields above
 * via IngredientPicker + nutrientsForWeight/sumNutrients (same math the
 * cart's own totals use), and those fields stay directly editable afterward
 * for a manual nudge - re-editing the ingredient list recomputes and
 * overwrites them again.
 *
 * Rendered inline as LogMealPage's "Custom meals" tab (it used to be a dialog
 * behind a floating button, which trainees rarely found). */
export default function CustomMealForm({ onAdd, onMoveToQuickLog }: Props) {
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [values, setValues] = useState(EMPTY_VALUES)
  const [ingredients, setIngredients] = useState<DraftComponent[]>([])
  const [ingredientsOpen, setIngredientsOpen] = useState(false)
  const [microsOpen, setMicrosOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName('')
    setCalories('')
    setValues(EMPTY_VALUES)
    setIngredients([])
    setIngredientsOpen(false)
    setMicrosOpen(false)
    setError(null)
  }

  // Recompute from the ingredient list whenever it changes - see
  // the component's doc comment for why it's a calculator, not a merge.
  useEffect(() => {
    const total = ingredientsTotal(ingredients)
    if (!total) return
    setCalories(total.calories !== null ? String(round(total.calories)) : '')
    setValues((v) => {
      const next = { ...v }
      for (const { key } of [...MACRO_FIELDS, ...MICRO_FIELDS]) {
        const value = total[key]
        next[key] = value !== null ? String(round(value)) : ''
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredients])

  const microsFilled = MICRO_FIELDS.filter(({ key }) => values[key]?.trim()).length

  function currentNutrients(): Nutrients {
    return {
      calories: calories.trim() ? Number(calories) : null,
      protein_g: values.protein_g.trim() ? Number(values.protein_g) : null,
      carbs_g: values.carbs_g.trim() ? Number(values.carbs_g) : null,
      fat_g: values.fat_g.trim() ? Number(values.fat_g) : null,
      fiber_g: values.fiber_g.trim() ? Number(values.fiber_g) : null,
      sugar_g: values.sugar_g.trim() ? Number(values.sugar_g) : null,
      sodium_mg: values.sodium_mg.trim() ? Number(values.sodium_mg) : null,
      potassium_mg: values.potassium_mg.trim() ? Number(values.potassium_mg) : null,
      calcium_mg: values.calcium_mg.trim() ? Number(values.calcium_mg) : null,
      iron_mg: values.iron_mg.trim() ? Number(values.iron_mg) : null,
      vitamin_c_mg: values.vitamin_c_mg.trim() ? Number(values.vitamin_c_mg) : null,
      vitamin_a_mcg: values.vitamin_a_mcg.trim() ? Number(values.vitamin_a_mcg) : null,
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !calories.trim() || !values.protein_g.trim() || !values.carbs_g.trim() || !values.fat_g.trim()) {
      setError('Name, calories, and macros (protein/carbs/fat) are required - only the micronutrients are optional.')
      return
    }
    onAdd(name.trim(), currentNutrients())
    reset()
  }

  function handleMoveToQuickLog() {
    onMoveToQuickLog({
      name: name.trim(),
      calories: calories.trim(),
      ...Object.fromEntries([...MACRO_FIELDS, ...MICRO_FIELDS].map(({ key }) => [key, values[key]?.trim() || null])),
    })
    reset()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        A one-time estimate for something you can't look up precisely (e.g. "Stew" at a party) - added to
        today's log only.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="custom-meal-name">Name</Label>
        <Input id="custom-meal-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="custom-meal-calories">Calories (kcal)</Label>
        <Input
          id="custom-meal-calories"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {MACRO_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <Label htmlFor={`custom-meal-${key}`}>{label}</Label>
            <Input
              id={`custom-meal-${key}`}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <CollapsibleSection
        title="Micronutrients (optional)"
        summary={microsFilled ? `${microsFilled} filled` : undefined}
        open={microsOpen}
        onOpenChange={setMicrosOpen}
      >
        <div className="grid grid-cols-2 gap-3">
          {MICRO_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <Label htmlFor={`custom-meal-${key}`}>{label}</Label>
              <Input
                id={`custom-meal-${key}`}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={values[key]}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Enter ingredients (optional)" open={ingredientsOpen} onOpenChange={setIngredientsOpen}>
        <p className="text-xs text-muted-foreground">
          Know roughly what went into it? Add each ingredient's amount and the fields above fill in
          automatically (still yours to adjust after).
        </p>
        <IngredientPicker value={ingredients} onChange={setIngredients} />
      </CollapsibleSection>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          Clear
        </Button>
        <Button type="submit" size="sm">
          Add
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        This will be logged just this once. For something you'll want to log again later, head to{' '}
        <button type="button" onClick={handleMoveToQuickLog} className="font-medium text-primary hover:underline">
          Saved meals
        </button>{' '}
        instead.
      </p>
    </form>
  )
}
