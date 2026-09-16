import type { FoodItemMeasure } from '@/api/types'

export type UnitOption = { value: string; label: string }

/** Anything with its own list of named measures - a full FoodItem, or a lighter
 * shape like ReferenceMealItemDetail's food_item_measures (a plan item logged by a
 * trainee should switch units too, even though the trainer authored it in grams). */
type MeasuredItem = { measures: FoodItemMeasure[] }

// Grams-per-unit is a fixed physical conversion for weight, available for every
// item regardless of what measures it defines.
export const UNIVERSAL_UNITS: UnitOption[] = [
  { value: 'g', label: 'g' },
  { value: 'oz', label: 'oz' },
  { value: 'lb', label: 'lb' },
]

const FIXED_GRAMS_PER_UNIT: Record<string, number> = { g: 1, oz: 28.35, lb: 453.59 }

/** Every unit this specific item can be logged in: the universal weight units plus
 * whatever food-specific measures (e.g. "tbsp", "whole (thigh)") it defines. */
export function availableUnits(item: MeasuredItem): UnitOption[] {
  return [...UNIVERSAL_UNITS, ...item.measures.map((m) => ({ value: m.label, label: m.label }))]
}

/** This item's own measure marked as default, if any - used as the entry basis in
 * AddFoodItemDialog and the caption shown for how its nutrition values are labeled. */
export function defaultMeasure(item: MeasuredItem) {
  return item.measures.find((m) => m.is_default)
}

/** Grams equal to 1 unit of `unit` for this item, or null if unresolvable (an
 * arbitrary label that isn't one of this item's own measures). */
export function gramsPerUnit(item: MeasuredItem, unit: string): number | null {
  const fixed = FIXED_GRAMS_PER_UNIT[unit]
  if (fixed !== undefined) return fixed
  const measure = item.measures.find((m) => m.label === unit)
  return measure ? Number(measure.grams_per_unit) : null
}

/** Converts a quantity entered in `unit` to grams, or null if the amount/unit combo
 * can't be resolved (empty/invalid amount, or a unit with no known gram conversion). */
export function gramsForQuantity(item: MeasuredItem, unit: string, quantity: string): number | null {
  const per = gramsPerUnit(item, unit)
  const qty = Number(quantity)
  if (per === null || quantity.trim() === '' || Number.isNaN(qty)) return null
  return qty * per
}
