import type { LoggedMeal, Nutrients } from '@/api/types'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatBedtime as formatTimeOfDay } from '@/lib/bedtime'
import { round } from '@/lib/utils'
import { MICRO_FIELDS } from './NutritionFactsDialog'

export function macroLine(n: Nutrients) {
  return `P ${round(n.protein_g ?? 0)}g · C ${round(n.carbs_g ?? 0)}g · F ${round(n.fat_g ?? 0)}g`
}

function sourceLabel(meal: LoggedMeal) {
  if (meal.source === 'custom') return 'Off plan'
  if (meal.source === 'mixed') return 'Plan + off plan'
  return meal.meal_option_label ? `From plan · ${meal.meal_option_label}` : 'From plan'
}

/** A logged meal's full breakdown - totals (calories, macros, any micros) plus
 * every item with its own amount, calories and macros. Read-only; editing
 * still goes through LogMealPage via the slot's Edit button. */
export default function LoggedMealDetailDialog({
  open,
  onOpenChange,
  meal,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  meal: LoggedMeal
}) {
  const total = meal.total_nutrients
  const micros = MICRO_FIELDS.filter(({ key }) => total[key] !== null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{meal.reference_meal_label}</DialogTitle>
          <DialogDescription>
            {sourceLabel(meal)}
            {meal.eaten_at && ` · Eaten at ${formatTimeOfDay(meal.eaten_at)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold">
              {total.calories !== null ? round(total.calories) : '—'}
              <span className="ml-1 text-sm font-normal text-muted-foreground">kcal</span>
            </span>
            <span className="text-sm text-muted-foreground">{macroLine(total)}</span>
          </div>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Items</h3>
            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {meal.items.map((item) => (
                <li key={item.id} className="flex min-w-0 flex-col gap-0.5 px-3 py-2">
                  <div className="flex min-w-0 justify-between gap-2">
                    <span className="min-w-0 flex-1 break-words text-sm">{item.food_item_name}</span>
                    {item.actual_weight_grams !== null && (
                      <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">
                        {round(Number(item.actual_weight_grams))}g
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.actual_nutrients.calories !== null ? round(item.actual_nutrients.calories) : '—'} kcal ·{' '}
                    {macroLine(item.actual_nutrients)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {micros.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Micronutrients</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {micros.map(({ key, label, unit }) => (
                  <div key={key} className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium">
                      {round(total[key] as number)}
                      {unit}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
