import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { createFoodItem, listFoodItems } from '../../api/foodItems'
import type { FoodItemVisibility } from '../../api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type DraftComponent = {
  ingredient: number
  name: string
  weight_grams: string
}

type IngredientPickerProps = {
  value: DraftComponent[]
  onChange: (next: DraftComponent[]) => void
  visibility: FoodItemVisibility
}

const NEW_INGREDIENT_FIELDS: { key: 'calories' | 'protein' | 'carbs' | 'fat'; label: string }[] = [
  { key: 'calories', label: 'Calories (kcal)' },
  { key: 'protein', label: 'Protein (g)' },
  { key: 'carbs', label: 'Carbs (g)' },
  { key: 'fat', label: 'Fat (g)' },
]

export default function IngredientPicker({ value, onChange, visibility }: IngredientPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: number; name: string; calories_per_100g: string }[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newIngredient, setNewIngredient] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      listFoodItems({ search: query }).then((items) => {
        if (!cancelled) setResults(items)
      })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  function addComponent(ingredient: { id: number; name: string }) {
    if (value.some((c) => c.ingredient === ingredient.id)) return
    onChange([...value, { ingredient: ingredient.id, name: ingredient.name, weight_grams: '' }])
    setQuery('')
    setResults([])
  }

  function updateWeight(ingredientId: number, weight_grams: string) {
    onChange(value.map((c) => (c.ingredient === ingredientId ? { ...c, weight_grams } : c)))
  }

  function removeComponent(ingredientId: number) {
    onChange(value.filter((c) => c.ingredient !== ingredientId))
  }

  async function handleCreateIngredient() {
    setError(null)
    const { name, calories, protein, carbs, fat } = newIngredient
    if (!name.trim() || !calories || !protein || !carbs || !fat) {
      setError('Name, calories, protein, carbs, and fat are all required.')
      return
    }
    setCreating(true)
    try {
      const created = await createFoodItem({
        name: name.trim(),
        barcode: null,
        kind: 'single',
        visibility,
        serving_unit: 'g',
        calories_per_100g: calories,
        protein_g_per_100g: protein,
        carbs_g_per_100g: carbs,
        fat_g_per_100g: fat,
      })
      addComponent(created)
      setNewIngredient({ name: '', calories: '', protein: '', carbs: '', fat: '' })
      setShowCreate(false)
    } catch {
      setError('Could not save that ingredient.')
    } finally {
      setCreating(false)
    }
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
                <span>{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.calories_per_100g} kcal/100g</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!showCreate ? (
        <Button type="button" variant="link" className="h-auto justify-start px-0" onClick={() => setShowCreate(true)}>
          Can't find it? Add a new ingredient
        </Button>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-ingredient-name">New ingredient name</Label>
            <Input
              id="new-ingredient-name"
              value={newIngredient.name}
              onChange={(e) => setNewIngredient((v) => ({ ...v, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {NEW_INGREDIENT_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor={`new-ingredient-${key}`}>{label}</Label>
                <Input
                  id={`new-ingredient-${key}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={newIngredient[key]}
                  onChange={(e) => setNewIngredient((v) => ({ ...v, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={creating} onClick={handleCreateIngredient}>
              {creating ? 'Adding…' : 'Add ingredient'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>Added ({value.length})</Label>
          {value.map((component) => (
            <div key={component.ingredient} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm">{component.name}</span>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                placeholder="grams"
                className="w-24"
                value={component.weight_grams}
                onChange={(e) => updateWeight(component.ingredient, e.target.value)}
                required
              />
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
          ))}
        </div>
      )}

      {value.length === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Plus className="size-3.5" /> Search and add at least one ingredient.
        </p>
      )}
    </div>
  )
}
