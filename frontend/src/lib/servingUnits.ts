import type { FoodItem, FoodItemServingUnit } from '@/api/types'

export const SERVING_UNIT_OPTIONS: { value: FoodItemServingUnit; label: string }[] = [
  { value: 'g', label: 'Grams' },
  { value: 'cup', label: 'Cups' },
  { value: 'oz', label: 'Ounces' },
  { value: 'lb', label: 'Pounds' },
  { value: 'each', label: 'Each' },
  { value: 'serving', label: 'Serving' },
]

// Grams-per-unit is a fixed physical conversion for weight units, but is food-specific
// (and must be supplied by whoever adds the item) for cup/each/serving.
export const FIXED_GRAMS_PER_UNIT: Partial<Record<FoodItemServingUnit, number>> = {
  oz: 28.35,
  lb: 453.59,
}

export const SERVING_UNIT_NOUN: Record<FoodItemServingUnit, string> = {
  g: 'gram',
  cup: 'cup',
  oz: 'ounce',
  lb: 'pound',
  each: 'each',
  serving: 'serving',
}

/** Nutrient values scaled from per-100g storage to the item's own display unit. */
export function scaleToServingUnit(perHundredGrams: number, servingSizeGrams: number | null) {
  if (!servingSizeGrams) return perHundredGrams
  return (perHundredGrams * servingSizeGrams) / 100
}

/** Grams equal to 1 unit of `unit` for this specific item - only known for the two
 * fixed weight units (oz/lb) or for the item's own defined serving unit. */
export function gramsPerUnit(item: FoodItem, unit: FoodItemServingUnit): number | null {
  if (unit === 'g') return 1
  const fixed = FIXED_GRAMS_PER_UNIT[unit]
  if (fixed !== undefined) return fixed
  if (unit === item.serving_unit && item.serving_size_grams) return Number(item.serving_size_grams)
  return null
}

/** Converts a quantity entered in `unit` to grams, or null if the amount/unit combo
 * can't be resolved (empty/invalid amount, or a unit with no known gram conversion). */
export function gramsForQuantity(item: FoodItem, unit: FoodItemServingUnit, quantity: string): number | null {
  const per = gramsPerUnit(item, unit)
  const qty = Number(quantity)
  if (per === null || quantity.trim() === '' || Number.isNaN(qty)) return null
  return qty * per
}
