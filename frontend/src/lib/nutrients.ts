import type { FoodItem, Nutrients } from '@/api/types'

const FIELD_MAP: { key: keyof Nutrients; source: keyof FoodItem }[] = [
  { key: 'calories', source: 'calories_per_100g' },
  { key: 'protein_g', source: 'protein_g_per_100g' },
  { key: 'carbs_g', source: 'carbs_g_per_100g' },
  { key: 'fat_g', source: 'fat_g_per_100g' },
  { key: 'fiber_g', source: 'fiber_g_per_100g' },
  { key: 'sugar_g', source: 'sugar_g_per_100g' },
  { key: 'sodium_mg', source: 'sodium_mg_per_100g' },
  { key: 'potassium_mg', source: 'potassium_mg_per_100g' },
  { key: 'calcium_mg', source: 'calcium_mg_per_100g' },
  { key: 'iron_mg', source: 'iron_mg_per_100g' },
  { key: 'vitamin_c_mg', source: 'vitamin_c_mg_per_100g' },
  { key: 'vitamin_a_mcg', source: 'vitamin_a_mcg_per_100g' },
]

/** Mirrors the backend's scale_nutrients: a FoodItem's per-100g values scaled to an
 * arbitrary consumed weight, for client-side "what if I log a different amount" previews. */
export function nutrientsForWeight(item: FoodItem, weightGrams: number): Nutrients {
  const result = {} as Nutrients
  for (const { key, source } of FIELD_MAP) {
    const per100g = item[source] as string | null
    result[key] = per100g !== null && per100g !== undefined ? (Number(per100g) * weightGrams) / 100 : null
  }
  return result
}

const NUTRIENT_KEYS = FIELD_MAP.map(({ key }) => key)

/** Rescales an already-computed Nutrients object (e.g. a plan item's reference_nutrients,
 * computed server-side at its reference weight) to a different weight, without needing
 * the underlying FoodItem's raw per-100g values. */
export function scaleNutrients(nutrients: Nutrients, fromGrams: number, toGrams: number): Nutrients {
  if (!fromGrams) return nutrients
  const factor = toGrams / fromGrams
  const result = {} as Nutrients
  for (const key of NUTRIENT_KEYS) {
    const value = nutrients[key]
    result[key] = value !== null ? value * factor : null
  }
  return result
}

/** Sums a list of Nutrients objects. A field stays null only if every input for it
 * was null (mirrors the backend's sum_nutrients). */
export function sumNutrients(list: Nutrients[]): Nutrients {
  const result = {} as Nutrients
  for (const key of NUTRIENT_KEYS) {
    let total: number | null = null
    for (const n of list) {
      const value = n[key]
      if (value !== null) total = (total ?? 0) + value
    }
    result[key] = total
  }
  return result
}

/** Means a list of Nutrients objects, field by field, skipping nulls (mirrors the
 * backend's average_nutrients). Empty input yields all-null. */
export function averageNutrients(list: Nutrients[]): Nutrients {
  const result = {} as Nutrients
  for (const key of NUTRIENT_KEYS) {
    let total = 0
    let count = 0
    for (const n of list) {
      const value = n[key]
      if (value !== null) {
        total += value
        count += 1
      }
    }
    result[key] = count > 0 ? total / count : null
  }
  return result
}
