import type { ReferenceMealDetail } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { round } from '@/lib/utils'
import { macroLine } from './LoggedMealDetailDialog'

/** A not-yet-logged meal's plan: every option the trainer set up, each with its
 * items (reference amount, calories, macros) and its own total - the
 * unlogged counterpart to LoggedMealDetailDialog. */
export default function PlannedMealDetailDialog({
  open,
  onOpenChange,
  meal,
  onLog,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  meal: ReferenceMealDetail
  /** Omitted when the viewer can't log (e.g. not a trainee). */
  onLog?: () => void
}) {
  const options = [...meal.options].sort((a, b) => a.order - b.order)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{meal.label}</DialogTitle>
          <DialogDescription>
            Not logged yet ·{' '}
            {options.length === 1 ? 'your plan' : `${options.length} options in your plan — pick any one`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {options.length === 0 && <p className="text-sm text-muted-foreground">No options planned for this meal.</p>}
          {options.map((option) => (
            <section key={option.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <h3 className="text-sm font-medium">{option.label}</h3>
                <span className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {option.nutrients.calories !== null ? round(option.nutrients.calories) : '—'} kcal
                  </span>{' '}
                  · {macroLine(option.nutrients)}
                </span>
              </div>
              <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {option.items.map((item) => (
                  <li key={item.id} className="flex min-w-0 flex-col gap-0.5 px-3 py-2">
                    <div className="flex min-w-0 justify-between gap-2">
                      <span className="min-w-0 flex-1 break-words text-sm">{item.food_item_name}</span>
                      <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">
                        {round(Number(item.reference_weight_grams))}g
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {item.reference_nutrients.calories !== null ? round(item.reference_nutrients.calories) : '—'} kcal
                      · {macroLine(item.reference_nutrients)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {onLog && (
            <Button type="button" onClick={onLog}>
              Log this meal
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
