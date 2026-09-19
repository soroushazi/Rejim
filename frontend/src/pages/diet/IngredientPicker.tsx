import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { listFoodItems } from '../../api/foodItems'
import type { FoodItem } from '../../api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { availableUnits, gramsForQuantity } from '@/lib/servingUnits'
import AddFoodItemDialog from './AddFoodItemDialog'

export type DraftComponent = {
  ingredient: number
  name: string
  weight_grams: string
  // Only set for a row added by search or by "Add a new ingredient" in this session -
  // enables the per-ingredient unit picker below, since it needs the item's own
  // measures to convert. Rows a caller preloads from an API that only returns
  // id/name/weight (e.g. ReferenceMealEditor's existing meal items) won't have it,
  // and fall back to a plain grams input.
  food_item?: FoodItem
  unit?: string
  quantity?: string
}

type IngredientPickerProps = {
  value: DraftComponent[]
  onChange: (next: DraftComponent[]) => void
  // Focuses the search box as soon as this picker mounts - used when a meal
  // option was just created, so the trainer can start adding ingredients
  // immediately instead of having to re-expand back down to this card.
  autoFocusSearch?: boolean
}

export default function IngredientPicker({ value, onChange, autoFocusSearch }: IngredientPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodItem[]>([])
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      listFoodItems({ search: query, pageSize: 20 }).then((data) => {
        if (!cancelled) setResults(data.results)
      })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  function addComponent(item: FoodItem) {
    if (value.some((c) => c.ingredient === item.id)) return
    onChange([...value, { ingredient: item.id, name: item.name, weight_grams: '', food_item: item, unit: 'g', quantity: '' }])
    setQuery('')
    setResults([])
  }

  function updateMeasurement(ingredientId: number, patch: Partial<Pick<DraftComponent, 'unit' | 'quantity'>>) {
    onChange(
      value.map((c) => {
        if (c.ingredient !== ingredientId || !c.food_item) return c
        const unit = patch.unit ?? c.unit ?? 'g'
        const quantity = patch.quantity ?? c.quantity ?? ''
        const grams = gramsForQuantity(c.food_item, unit, quantity)
        return { ...c, unit, quantity, weight_grams: grams !== null ? String(grams) : '' }
      }),
    )
  }

  function updateWeight(ingredientId: number, weight_grams: string) {
    onChange(value.map((c) => (c.ingredient === ingredientId ? { ...c, weight_grams } : c)))
  }

  function removeComponent(ingredientId: number) {
    onChange(value.filter((c) => c.ingredient !== ingredientId))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ingredient-search">Ingredients</Label>
        <Input
          id="ingredient-search"
          placeholder="Search food bank…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus={autoFocusSearch}
        />
      </div>

      {results.length > 0 && (
        <ul className="flex flex-col overflow-hidden rounded-lg border border-border">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => addComponent(item)}
              >
                <span>
                  {item.name}
                  {item.brand_name && <span className="text-muted-foreground"> ({item.brand_name})</span>}
                </span>
                <span className="text-xs text-muted-foreground">{item.calories_per_100g} kcal/100g</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="link" className="h-auto justify-start px-0" onClick={() => setAddOpen(true)}>
        Can't find it? Add a new ingredient
      </Button>

      {value.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>Added ({value.length})</Label>
          {value.map((component) => (
            <div key={component.ingredient} className="flex flex-col gap-1.5 rounded-lg border border-border p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{component.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${component.name}`}
                  onClick={() => removeComponent(component.ingredient)}
                >
                  <X className="size-4" />
                </Button>
              </div>

              {component.food_item ? (
                <>
                  <Select
                    value={component.unit ?? 'g'}
                    onValueChange={(v) => updateMeasurement(component.ingredient, { unit: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUnits(component.food_item).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    placeholder={`Amount (${component.unit ?? 'g'})`}
                    value={component.quantity ?? ''}
                    onChange={(e) => updateMeasurement(component.ingredient, { quantity: e.target.value })}
                    required
                  />
                </>
              ) : (
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  placeholder="grams"
                  value={component.weight_grams}
                  onChange={(e) => updateWeight(component.ingredient, e.target.value)}
                  required
                />
              )}
            </div>
          ))}
        </div>
      )}

      {value.length === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Plus className="size-3.5" /> Search and add at least one ingredient.
        </p>
      )}

      <AddFoodItemDialog open={addOpen} onOpenChange={setAddOpen} onCreated={addComponent} singleItemOnly />
    </div>
  )
}
