import { useEffect, useState, type FormEvent } from 'react'
import { createQuickLogItem } from '@/api/quickLogItems'
import type { NewQuickLogItem, Nutrients, QuickLogItem } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, round } from '@/lib/utils'
import CollapsibleFormSection from './CollapsibleFormSection'
import IngredientPicker, { ingredientsTotal, type DraftComponent } from './IngredientPicker'

type Mode = 'ingredients' | 'custom'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (item: QuickLogItem) => void
  // Seeds every field when opening - either just a searched name (the empty-
  // Food-Bank-search "Add..." link) or a full draft handed over from
  // CustomMealForm's "head to saved meals" link, which carries over
  // whatever the trainee had already typed there.
  initialValues?: Partial<NewQuickLogItem>
}

const MACRO_FIELDS: { key: keyof NewQuickLogItem; label: string }[] = [
  { key: 'protein_g', label: 'Protein (g)' },
  { key: 'carbs_g', label: 'Carbs (g)' },
  { key: 'fat_g', label: 'Fat (g)' },
]

const MICRO_FIELDS: { key: keyof NewQuickLogItem; label: string }[] = [
  { key: 'fiber_g', label: 'Fiber (g)' },
  { key: 'sugar_g', label: 'Sugar (g)' },
  { key: 'sodium_mg', label: 'Sodium (mg)' },
  { key: 'potassium_mg', label: 'Potassium (mg)' },
  { key: 'calcium_mg', label: 'Calcium (mg)' },
  { key: 'iron_mg', label: 'Iron (mg)' },
  { key: 'vitamin_c_mg', label: 'Vitamin C (mg)' },
  { key: 'vitamin_a_mcg', label: 'Vitamin A (mcg)' },
]

const VALUE_FIELDS = [...MACRO_FIELDS, ...MICRO_FIELDS]

function valuesFrom(initialValues: Partial<NewQuickLogItem> | undefined): Record<string, string> {
  return Object.fromEntries(VALUE_FIELDS.map(({ key }) => [key, initialValues?.[key] ?? ''])) as Record<
    string,
    string
  >
}

/** True when a handed-over draft already carries typed-in nutrition (CustomMealForm's
 * "head to saved meals" link) - that belongs in Custom mode, not a fresh ingredient list. */
function hasTypedValues(initialValues: Partial<NewQuickLogItem> | undefined): boolean {
  return !!initialValues?.calories || VALUE_FIELDS.some(({ key }) => !!initialValues?.[key])
}

/** A trainee's saved meal (e.g. "my protein shake") - logged as a single
 * fixed-value item, no weight/amount entry. See nutrition/models.py::QuickLogItem.
 *
 * Two ways to build one:
 * - **From ingredients**: pick one or more Food Bank items + amounts (the same
 *   IngredientPicker the composite FoodItem builder uses) and the per-serving
 *   totals are computed from them client-side. Only those flat totals are saved -
 *   QuickLogItem has no ingredient breakdown, same as CustomMealForm's calculator.
 * - **Custom**: type the nutrition in directly, for something that can't be
 *   measured. */
export default function AddQuickLogItemDialog({ open, onOpenChange, onCreated, initialValues }: Props) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [calories, setCalories] = useState(initialValues?.calories ?? '')
  const [values, setValues] = useState(valuesFrom(initialValues))
  const [mode, setMode] = useState<Mode>(hasTypedValues(initialValues) ? 'custom' : 'ingredients')
  const [ingredients, setIngredients] = useState<DraftComponent[]>([])
  const [microsOpen, setMicrosOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName(initialValues?.name ?? '')
    setCalories(initialValues?.calories ?? '')
    setValues(valuesFrom(initialValues))
    setMode(hasTypedValues(initialValues) ? 'custom' : 'ingredients')
    setIngredients([])
    setMicrosOpen(false)
    setError(null)
  }

  useEffect(() => {
    if (open) reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues])

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  const ingredientNutrients = ingredientsTotal(ingredients)
  const microsFilled = MICRO_FIELDS.filter(({ key }) => values[key]?.trim()).length

  function payload(): NewQuickLogItem | string {
    if (!name.trim()) return 'Give this meal a name.'
    if (mode === 'ingredients') {
      if (!ingredientNutrients || ingredientNutrients.calories === null) {
        return 'Add at least one ingredient with an amount.'
      }
      if (ingredients.some((c) => !(Number(c.weight_grams) > 0))) {
        return 'Enter an amount for every ingredient (or remove it).'
      }
      const n = ingredientNutrients
      return {
        name: name.trim(),
        calories: String(round(n.calories!)),
        ...Object.fromEntries(
          VALUE_FIELDS.map(({ key }) => {
            const value = n[key as keyof Nutrients]
            return [key, value !== null ? String(round(value)) : null]
          }),
        ),
      }
    }
    if (!calories.trim()) return 'Name and calories are required.'
    return {
      name: name.trim(),
      calories: calories.trim(),
      ...Object.fromEntries(VALUE_FIELDS.map(({ key }) => [key, values[key]?.trim() || null])),
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const data = payload()
    if (typeof data === 'string') {
      setError(data)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const created = await createQuickLogItem(data)
      onCreated(created)
      handleOpenChange(false)
    } catch {
      setError('Could not save this meal.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New saved meal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Something you log the same way again and again (e.g. "Protein shake") - one tap to add it later, no
            amounts needed.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-log-name">Name</Label>
            <Input id="quick-log-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="flex gap-1 rounded-full bg-muted p-1">
            {(
              [
                { value: 'ingredients', label: 'From ingredients' },
                { value: 'custom', label: 'Custom' },
              ] as { value: Mode; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value)
                  setError(null)
                }}
                className={cn(
                  'flex-1 rounded-full py-1.5 text-center text-xs font-semibold transition-colors',
                  mode === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === 'ingredients' ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                Add one or more foods from the Food Bank with the amount in one serving - the nutrition is worked out
                for you.
              </p>
              <IngredientPicker value={ingredients} onChange={setIngredients} />
              <div className="flex items-baseline justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                <span className="font-medium">
                  {ingredientNutrients?.calories != null ? round(ingredientNutrients.calories) : '—'} kcal
                </span>
                <span className="flex gap-3 text-muted-foreground">
                  <span>P {ingredientNutrients?.protein_g != null ? round(ingredientNutrients.protein_g) : '—'}g</span>
                  <span>C {ingredientNutrients?.carbs_g != null ? round(ingredientNutrients.carbs_g) : '—'}g</span>
                  <span>F {ingredientNutrients?.fat_g != null ? round(ingredientNutrients.fat_g) : '—'}g</span>
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quick-log-calories">Calories (kcal)</Label>
                <Input
                  id="quick-log-calories"
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
                    <Label htmlFor={`quick-log-${key}`}>{label}</Label>
                    <Input
                      id={`quick-log-${key}`}
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
              <CollapsibleFormSection
                title="Micronutrients (optional)"
                summary={microsFilled ? `${microsFilled} filled` : undefined}
                open={microsOpen}
                onOpenChange={setMicrosOpen}
              >
                <div className="grid grid-cols-2 gap-3">
                  {MICRO_FIELDS.map(({ key, label }) => (
                    <div key={key} className="flex flex-col gap-1.5">
                      <Label htmlFor={`quick-log-${key}`}>{label}</Label>
                      <Input
                        id={`quick-log-${key}`}
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
              </CollapsibleFormSection>
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
