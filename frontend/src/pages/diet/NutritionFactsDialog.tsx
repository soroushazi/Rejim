import type { Nutrients } from '@/api/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { round } from '@/lib/utils'

const MICRO_FIELDS: { key: keyof Nutrients; label: string; unit: string }[] = [
  { key: 'fiber_g', label: 'Fiber', unit: 'g' },
  { key: 'sugar_g', label: 'Sugar', unit: 'g' },
  { key: 'sodium_mg', label: 'Sodium', unit: 'mg' },
  { key: 'potassium_mg', label: 'Potassium', unit: 'mg' },
  { key: 'calcium_mg', label: 'Calcium', unit: 'mg' },
  { key: 'iron_mg', label: 'Iron', unit: 'mg' },
  { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg' },
  { key: 'vitamin_a_mcg', label: 'Vitamin A', unit: 'mcg' },
]

/** A lighter, data-shape-agnostic sibling of FoodItemNutritionFacts (which is tied to
 * FoodItem's per-100g fields, macro filters, and alternatives - all Food-Bank-specific
 * concepts) - this one just shows whatever a plain Nutrients object has, for the row
 * kinds on the meal-logging screen that aren't backed by a FoodItem at all (a plan
 * item's reference_nutrients, a QuickLogItem's fixed values) as well as Food Bank rows
 * browsed from here. Micros that are null (not available for this item) are omitted
 * rather than shown as zero, matching "if available" - not every source has all of them. */
export default function NutritionFactsDialog({
  open,
  onOpenChange,
  name,
  caption,
  nutrients,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  caption: string
  nutrients: Nutrients
}) {
  const micros = MICRO_FIELDS.filter(({ key }) => nutrients[key] !== null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold">
              {nutrients.calories !== null ? round(nutrients.calories) : '—'}
              <span className="ml-1 text-sm font-normal text-muted-foreground">kcal</span>
            </span>
            <span className="flex gap-3 text-sm text-muted-foreground">
              <span>P {nutrients.protein_g !== null ? round(nutrients.protein_g) : '—'}g</span>
              <span>C {nutrients.carbs_g !== null ? round(nutrients.carbs_g) : '—'}g</span>
              <span>F {nutrients.fat_g !== null ? round(nutrients.fat_g) : '—'}g</span>
            </span>
          </div>

          <p className="text-xs text-muted-foreground">{caption}</p>

          {micros.length > 0 ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {micros.map(({ key, label, unit }) => (
                <div key={key} className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium">
                    {round(nutrients[key] as number)}
                    {unit}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-xs text-muted-foreground">No micronutrient data.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
