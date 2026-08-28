import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { listFoodItems } from '@/api/foodItems'
import type { FoodItem, FoodItemServingUnit } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { nutrientsForWeight } from '@/lib/nutrients'
import { gramsForQuantity, gramsPerUnit, SERVING_UNIT_OPTIONS } from '@/lib/servingUnits'
import { round } from '@/lib/utils'
import AddFoodItemDialog from './AddFoodItemDialog'

export type DraftCustomItem = {
  food_item: FoodItem
  unit: FoodItemServingUnit
  quantity: string
}

type Props = {
  value: DraftCustomItem[]
  onChange: (next: DraftCustomItem[]) => void
}

export default function CustomMealItemPicker({ value, onChange }: Props) {
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
      listFoodItems(query).then((items) => {
        if (!cancelled) setResults(items)
      })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  function addItem(item: FoodItem) {
    if (value.some((v) => v.food_item.id === item.id)) return
    onChange([...value, { food_item: item, unit: 'g', quantity: '' }])
    setQuery('')
    setResults([])
  }

  function updateItem(id: number, patch: Partial<Pick<DraftCustomItem, 'unit' | 'quantity'>>) {
    onChange(value.map((v) => (v.food_item.id === id ? { ...v, ...patch } : v)))
  }

  function removeItem(id: number) {
    onChange(value.filter((v) => v.food_item.id !== id))
  }

  return (
    <div className="flex flex-col gap-2">
      <Input placeholder="Search food bank…" value={query} onChange={(e) => setQuery(e.target.value)} />

      {results.length > 0 && (
        <ul className="flex flex-col overflow-hidden rounded-lg border border-border">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => addItem(item)}
              >
                <span>{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.calories_per_100g} kcal/100g</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="link" className="h-auto justify-start px-0" onClick={() => setAddOpen(true)}>
        Can't find it? Add a new food item
      </Button>

      {value.length > 0 && (
        <div className="flex flex-col gap-2">
          {value.map(({ food_item, unit, quantity }) => {
            const availableUnits = SERVING_UNIT_OPTIONS.filter((opt) => gramsPerUnit(food_item, opt.value) !== null)
            const grams = gramsForQuantity(food_item, unit, quantity)
            const nutrients = grams !== null ? nutrientsForWeight(food_item, grams) : null
            return (
              <div key={food_item.id} className="flex flex-col gap-1.5 rounded-lg border border-border p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{food_item.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${food_item.name}`}
                    onClick={() => removeItem(food_item.id)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    placeholder="Amount"
                    className="w-24"
                    value={quantity}
                    onChange={(e) => updateItem(food_item.id, { quantity: e.target.value })}
                  />
                  <Select value={unit} onValueChange={(v) => updateItem(food_item.id, { unit: v as FoodItemServingUnit })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUnits.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {nutrients?.calories !== null && nutrients?.calories !== undefined
                      ? `${round(nutrients.calories)} kcal`
                      : '—'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {value.length === 0 && <p className="text-xs text-muted-foreground">Search and add at least one ingredient.</p>}

      <AddFoodItemDialog open={addOpen} onOpenChange={setAddOpen} onCreated={(item) => addItem(item)} />
    </div>
  )
}
