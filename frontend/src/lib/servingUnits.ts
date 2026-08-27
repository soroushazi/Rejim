import type { FoodItemServingUnit } from '@/api/types'

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
