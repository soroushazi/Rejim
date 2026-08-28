import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { ApiError } from '@/api/client'
import { getFoodItem } from '@/api/foodItems'
import { deleteLoggedMeal, saveLoggedMeal } from '@/api/loggedMeals'
import type { LoggedMeal, LoggedMealSource, MealOptionDetail, Nutrients, ReferenceMealDetail } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { nutrientsForWeight, scaleNutrients, sumNutrients } from '@/lib/nutrients'
import { gramsForQuantity } from '@/lib/servingUnits'
import { cn, round } from '@/lib/utils'
import CustomMealItemPicker, { type DraftCustomItem } from './CustomMealItemPicker'

type Props = {
  meal: ReferenceMealDetail
  date: string
  loggedMeal: LoggedMeal | null
  onSaved: (meal: LoggedMeal) => void
  onCleared: (referenceMealId: number) => void
}

/** Default weights for a plan option: the trainee's previously-saved actuals for any
 * item that matches, falling back to the plan's reference weight otherwise. */
function weightsForOption(option: MealOptionDetail, loggedMeal: LoggedMeal | null): Record<number, string> {
  const saved = new Map<number, string>()
  if (loggedMeal?.source === 'plan') {
    for (const item of loggedMeal.items) {
      if (item.reference_meal_item) saved.set(item.reference_meal_item, item.actual_weight_grams)
    }
  }
  const result: Record<number, string> = {}
  for (const item of option.items) {
    result[item.id] = saved.get(item.id) ?? item.reference_weight_grams
  }
  return result
}

export default function LogMealSlot({ meal, date, loggedMeal, onSaved, onCleared }: Props) {
  const { user } = useAuth()
  const canLog = user?.role === 'trainee'
  const [editing, setEditing] = useState(false)
  const options = useMemo(() => [...meal.options].sort((a, b) => a.order - b.order), [meal.options])

  const [mode, setMode] = useState<LoggedMealSource>('plan')
  const [selectedOptionId, setSelectedOptionId] = useState<number | undefined>(options[0]?.id)
  const [weights, setWeights] = useState<Record<number, string>>({})
  const [customItems, setCustomItems] = useState<DraftCustomItem[]>([])
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedOption = options.find((o) => o.id === selectedOptionId) ?? options[0]

  async function startEditing() {
    setError(null)
    const opt =
      (loggedMeal?.source === 'plan' && options.find((o) => o.label === loggedMeal.meal_option_label)) || options[0]
    setMode(loggedMeal?.source ?? 'plan')
    setSelectedOptionId(opt?.id)
    setWeights(opt ? weightsForOption(opt, loggedMeal) : {})

    if (loggedMeal?.source === 'custom') {
      const items = await Promise.all(
        loggedMeal.items.map(async (item) => ({
          food_item: await getFoodItem(item.food_item as number),
          unit: 'g' as const,
          quantity: item.actual_weight_grams,
        })),
      )
      setCustomItems(items)
    } else {
      setCustomItems([])
    }
    setEditing(true)
  }

  function selectOption(option: MealOptionDetail) {
    setSelectedOptionId(option.id)
    setWeights(weightsForOption(option, loggedMeal?.source === 'plan' ? loggedMeal : null))
  }

  const previewNutrients: Nutrients | null = useMemo(() => {
    if (mode === 'plan') {
      if (!selectedOption) return null
      return sumNutrients(
        selectedOption.items.map((item) => {
          const refGrams = Number(item.reference_weight_grams)
          const grams = Number(weights[item.id])
          if (!weights[item.id] || Number.isNaN(grams)) return item.reference_nutrients
          return scaleNutrients(item.reference_nutrients, refGrams, grams)
        }),
      )
    }
    return sumNutrients(
      customItems.flatMap((i) => {
        const grams = gramsForQuantity(i.food_item, i.unit, i.quantity)
        return grams !== null ? [nutrientsForWeight(i.food_item, grams)] : []
      }),
    )
  }, [mode, selectedOption, weights, customItems])

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      if (mode === 'plan') {
        if (!selectedOption) return
        const items = selectedOption.items.map((item) => ({
          reference_meal_item: item.id,
          actual_weight_grams: weights[item.id] ?? '',
        }))
        if (items.some((i) => !i.actual_weight_grams.trim())) {
          setError('Enter a weight for every ingredient.')
          return
        }
        const saved = await saveLoggedMeal({ reference_meal: meal.id, date, source: 'plan', items })
        onSaved(saved)
        setEditing(false)
      } else {
        if (customItems.length === 0) {
          // Cleared every ingredient while editing - treat like removing the log
          // entirely rather than erroring, since there's nothing left to save.
          if (loggedMeal) await deleteLoggedMeal(loggedMeal.id)
          onCleared(meal.id)
          setEditing(false)
          return
        }
        const grams = customItems.map((i) => gramsForQuantity(i.food_item, i.unit, i.quantity))
        if (grams.some((g) => g === null)) {
          setError('Enter a valid amount for every ingredient.')
          return
        }
        const saved = await saveLoggedMeal({
          reference_meal: meal.id,
          date,
          source: 'custom',
          items: customItems.map((i, index) => ({
            food_item: i.food_item.id,
            actual_weight_grams: String(grams[index]),
          })),
        })
        onSaved(saved)
        setEditing(false)
      }
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 403
          ? "Only the trainee can log their own meals."
          : 'Could not save this meal.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleClear() {
    if (!loggedMeal) return
    if (!window.confirm(`Remove your logged ${meal.label.toLowerCase()}?`)) return
    setClearing(true)
    setError(null)
    try {
      await deleteLoggedMeal(loggedMeal.id)
      onCleared(meal.id)
    } catch {
      setError('Could not remove this log.')
    } finally {
      setClearing(false)
    }
  }

  const isCustomLogged = loggedMeal?.source === 'custom'

  return (
    <li
      className={cn(
        'overflow-hidden rounded-lg border bg-background',
        isCustomLogged && !editing ? 'border-destructive/40 bg-destructive/5' : 'border-border',
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex flex-col gap-1">
          <span className="font-medium">{meal.label}</span>
          {!editing && loggedMeal?.source === 'plan' && loggedMeal.meal_option_label && (
            <span className="text-xs text-muted-foreground">From plan · {loggedMeal.meal_option_label}</span>
          )}
          {!editing && isCustomLogged && (
            <Badge variant="destructive" className="w-fit font-normal">
              Off plan
            </Badge>
          )}
          {!editing && !loggedMeal && <span className="text-xs text-muted-foreground">Not logged yet</span>}
        </div>
        <div className="flex items-center gap-2">
          {!editing && loggedMeal && (
            <span className="whitespace-nowrap text-sm text-muted-foreground">
              {loggedMeal.total_nutrients.calories !== null ? round(loggedMeal.total_nutrients.calories) : '—'} kcal
            </span>
          )}
          {!editing && canLog && loggedMeal && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              disabled={clearing}
              aria-label={`Remove logged ${meal.label}`}
              onClick={handleClear}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
          {!editing && canLog && (
            <Button type="button" size="sm" variant="outline" onClick={startEditing}>
              {loggedMeal ? 'Edit' : 'Log this meal'}
            </Button>
          )}
        </div>
      </div>

      {!editing && error && <p className="px-3 pb-2 text-sm text-destructive">{error}</p>}

      {editing && (
        <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
          <div className="flex gap-1 rounded-full bg-muted p-1">
            <button
              type="button"
              className={cn(
                'flex-1 rounded-full py-1 text-center text-xs font-semibold transition-colors',
                mode === 'plan' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
              )}
              onClick={() => setMode('plan')}
            >
              From plan
            </button>
            <button
              type="button"
              className={cn(
                'flex-1 rounded-full py-1 text-center text-xs font-semibold transition-colors',
                mode === 'custom' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
              )}
              onClick={() => setMode('custom')}
            >
              Custom (off plan)
            </button>
          </div>

          {mode === 'plan' && (
            <>
              {options.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {options.map((option, index) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => selectOption(option)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-medium',
                        option.id === selectedOptionId
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border text-muted-foreground',
                      )}
                    >
                      {String.fromCharCode(65 + index)}) {option.label}
                    </button>
                  ))}
                </div>
              )}

              {selectedOption && (
                <div className="flex flex-col gap-2">
                  {selectedOption.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm">{item.food_item_name}</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="1"
                        className="w-24"
                        value={weights[item.id] ?? ''}
                        onChange={(e) => setWeights((w) => ({ ...w, [item.id]: e.target.value }))}
                      />
                      <span className="w-3 text-xs text-muted-foreground">g</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {mode === 'custom' && <CustomMealItemPicker value={customItems} onChange={setCustomItems} />}

          {previewNutrients && (
            <div className="flex items-baseline justify-between gap-2 border-t border-border pt-2 text-sm">
              <span className="font-medium">
                {previewNutrients.calories !== null ? round(previewNutrients.calories) : '—'} kcal
              </span>
              <span className="flex gap-3 text-muted-foreground">
                <span>P {previewNutrients.protein_g !== null ? round(previewNutrients.protein_g) : '—'}g</span>
                <span>C {previewNutrients.carbs_g !== null ? round(previewNutrients.carbs_g) : '—'}g</span>
                <span>F {previewNutrients.fat_g !== null ? round(previewNutrients.fat_g) : '—'}g</span>
              </span>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}
