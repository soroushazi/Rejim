import { useEffect, useState } from 'react'
import { getFoodItem } from '@/api/foodItems'
import type { FoodItem, FoodItemServingUnit, Nutrients } from '@/api/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { nutrientsForWeight } from '@/lib/nutrients'
import { gramsPerUnit, SERVING_UNIT_OPTIONS } from '@/lib/servingUnits'
import { round } from '@/lib/utils'

const UNIT_PLURAL_LABEL: Record<FoodItemServingUnit, string> = {
  g: 'grams',
  cup: 'cups',
  oz: 'ounces',
  lb: 'pounds',
  each: 'each',
  serving: 'servings',
}

const MACRO_ROWS: { key: keyof Nutrients; label: string }[] = [
  { key: 'protein_g', label: 'P' },
  { key: 'carbs_g', label: 'C' },
  { key: 'fat_g', label: 'F' },
]

const MICRO_ROWS: { key: keyof Nutrients; label: string; unit: string }[] = [
  { key: 'fiber_g', label: 'Fiber', unit: 'g' },
  { key: 'sugar_g', label: 'Sugar', unit: 'g' },
  { key: 'sodium_mg', label: 'Sodium', unit: 'mg' },
  { key: 'potassium_mg', label: 'Potassium', unit: 'mg' },
  { key: 'calcium_mg', label: 'Calcium', unit: 'mg' },
  { key: 'iron_mg', label: 'Iron', unit: 'mg' },
  { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg' },
  { key: 'vitamin_a_mcg', label: 'Vitamin A', unit: 'mcg' },
]

type Props = {
  foodItemId: number | null
  defaultWeightGrams: number
  onOpenChange: (open: boolean) => void
}

export default function IngredientNutrientDialog({ foodItemId, defaultWeightGrams, onOpenChange }: Props) {
  const [item, setItem] = useState<FoodItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [unit, setUnit] = useState<FoodItemServingUnit>('g')
  const [quantity, setQuantity] = useState('')

  useEffect(() => {
    if (foodItemId === null) return
    let cancelled = false
    setLoading(true)
    setError(false)
    setItem(null)
    getFoodItem(foodItemId)
      .then((data) => {
        if (cancelled) return
        setItem(data)
        setUnit('g')
        setQuantity(String(defaultWeightGrams))
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [foodItemId, defaultWeightGrams])

  const availableUnits = item
    ? SERVING_UNIT_OPTIONS.filter((opt) => gramsPerUnit(item, opt.value) !== null)
    : []

  const qtyNumber = Number(quantity)
  const perUnit = item && quantity.trim() !== '' && !Number.isNaN(qtyNumber) ? gramsPerUnit(item, unit) : null
  const grams = perUnit !== null && perUnit !== undefined ? qtyNumber * perUnit : null
  const nutrients = item && grams !== null ? nutrientsForWeight(item, grams) : null

  return (
    <Dialog open={foodItemId !== null} onOpenChange={(next) => !next && onOpenChange(false)}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{item?.name ?? 'Ingredient'}</DialogTitle>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && error && (
          <p className="text-sm text-muted-foreground">Couldn't load this ingredient.</p>
        )}

        {!loading && !error && item && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor="ingredient-qty">Amount</Label>
                <Input
                  id="ingredient-qty"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor="ingredient-unit">Measure</Label>
                <Select value={unit} onValueChange={(v) => setUnit(v as FoodItemServingUnit)}>
                  <SelectTrigger id="ingredient-unit" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUnits.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {UNIT_PLURAL_LABEL[opt.value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {grams === null || !nutrients ? (
              <p className="text-xs text-muted-foreground">Enter a valid amount.</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{round(grams)}g</p>

                <div className="flex items-baseline justify-between gap-2 border-t border-border pt-3">
                  <span className="text-2xl font-semibold">
                    {nutrients.calories !== null ? round(nutrients.calories) : '—'}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">kcal</span>
                  </span>
                  <span className="flex gap-3 text-sm text-muted-foreground">
                    {MACRO_ROWS.map(({ key, label }) => (
                      <span key={key}>
                        {label} {nutrients[key] !== null ? round(nutrients[key] as number) : '—'}g
                      </span>
                    ))}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border pt-3">
                  {MICRO_ROWS.map(({ key, label, unit: micronutrientUnit }) => (
                    <div key={key} className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium">
                        {nutrients[key] !== null ? round(nutrients[key] as number) : '—'}
                        {micronutrientUnit}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
