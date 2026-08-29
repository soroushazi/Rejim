import type { DietaryTag, FoodItem, MacroFilter } from '../../api/types'
import { SERVING_UNIT_NOUN } from '@/lib/servingUnits'
import { Badge } from '@/components/ui/badge'
import { round } from '@/lib/utils'

export const MICRO_FIELDS: { key: keyof FoodItem; label: string; unit: string }[] = [
  { key: 'fiber_g_per_100g', label: 'Fiber', unit: 'g' },
  { key: 'sugar_g_per_100g', label: 'Sugar', unit: 'g' },
  { key: 'sodium_mg_per_100g', label: 'Sodium', unit: 'mg' },
  { key: 'potassium_mg_per_100g', label: 'Potassium', unit: 'mg' },
  { key: 'calcium_mg_per_100g', label: 'Calcium', unit: 'mg' },
  { key: 'iron_mg_per_100g', label: 'Iron', unit: 'mg' },
  { key: 'vitamin_c_mg_per_100g', label: 'Vitamin C', unit: 'mg' },
  { key: 'vitamin_a_mcg_per_100g', label: 'Vitamin A', unit: 'mcg' },
]

/** Per-serving (or per-100g) calories/macros/micros for a FoodItem - the shared
 * facts block used both by the Food Bank card's expanded view and the alternatives
 * detail dialog, so the two stay visually and numerically consistent. */
export default function FoodItemNutritionFacts({
  item,
  macroFilters,
  dietaryTags,
}: {
  item: FoodItem
  macroFilters: MacroFilter[]
  dietaryTags: DietaryTag[]
}) {
  const itemMacroFilters = macroFilters.filter((f) => item.macro_filters.includes(f.id))
  const itemDietaryTags = dietaryTags.filter((t) => item.dietary_tags.includes(t.id))

  const servingGrams = item.serving_size_grams ? Number(item.serving_size_grams) : null
  const factor = servingGrams ? servingGrams / 100 : 1
  const usesCustomUnit = item.serving_unit !== 'g' && servingGrams !== null
  const servingCaption = usesCustomUnit
    ? `Per ${SERVING_UNIT_NOUN[item.serving_unit]} (${servingGrams}g)`
    : 'Per 100g'

  function scaled(value: string) {
    return round(Number(value) * factor)
  }

  const micros = MICRO_FIELDS.filter(({ key }) => item[key] !== null)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-semibold">
          {scaled(item.calories_per_100g)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">kcal</span>
        </span>
        <span className="flex gap-3 text-sm text-muted-foreground">
          <span>P {scaled(item.protein_g_per_100g)}g</span>
          <span>C {scaled(item.carbs_g_per_100g)}g</span>
          <span>F {scaled(item.fat_g_per_100g)}g</span>
        </span>
      </div>

      {(itemMacroFilters.length > 0 || itemDietaryTags.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {itemMacroFilters.map((f) => (
            <Badge key={`mf-${f.id}`} variant="secondary" className="font-normal">
              {f.name}
            </Badge>
          ))}
          {itemDietaryTags.map((t) => (
            <Badge key={`dt-${t.id}`} variant="outline" className="font-normal">
              {t.name}
            </Badge>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{servingCaption}</p>
      {micros.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {micros.map(({ key, label, unit }) => (
            <div key={key} className="flex justify-between text-sm">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">
                {scaled(item[key] as string)}
                {unit}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">No micronutrient data.</p>
      )}

      {item.kind === 'composite' && item.components.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="mb-1.5 text-xs text-muted-foreground">Ingredients</p>
          <ul className="flex flex-col gap-1 text-sm">
            {item.components.map((c) => (
              <li key={c.id} className="flex justify-between">
                <span>{c.ingredient_name}</span>
                <span className="text-muted-foreground">{round(Number(c.weight_grams))}g</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
