import type { MealOptionDetail, Nutrients, ReferenceMealDetail } from '@/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { sumNutrients } from '@/lib/nutrients'
import { round } from '@/lib/utils'

/** "520 kcal · P 40g · C 50g · F 15g" - shared by this card, each meal's
 * header, and each option's header in the plan editor. */
export function MacroLine({ nutrients, className }: { nutrients: Nutrients; className?: string }) {
  const fmt = (v: number | null) => (v !== null ? round(v) : '—')
  return (
    <span className={className}>
      {fmt(nutrients.calories)} kcal · P {fmt(nutrients.protein_g)}g · C {fmt(nutrients.carbs_g)}g · F {fmt(nutrients.fat_g)}g
    </span>
  )
}

type Props = {
  meals: ReferenceMealDetail[]
  selectedOptionFor: (meal: ReferenceMealDetail) => MealOptionDetail | null
  onSelectOption: (mealId: number, optionId: number) => void
  nutrientsFor: (option: MealOptionDetail) => Nutrients
}

/** Live daily total for the plan being edited. With one option per meal
 * that's simply the whole plan; once any meal has alternatives, the total
 * is for one pick per meal (defaulting to each meal's first option), with a
 * per-meal dropdown to try other combinations. */
export default function PlanNutritionSummary({ meals, selectedOptionFor, onSelectOption, nutrientsFor }: Props) {
  const picks = meals.map((meal) => ({ meal, option: selectedOptionFor(meal) }))
  const total = sumNutrients(picks.flatMap(({ option }) => (option ? [nutrientsFor(option)] : [])))
  const hasAlternatives = meals.some((meal) => meal.options.length > 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily total</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-2xl font-semibold">
            {total.calories !== null ? round(total.calories) : 0}
            <span className="ml-1 text-sm font-normal text-muted-foreground">kcal</span>
          </span>
          <span className="flex gap-3 text-sm text-muted-foreground">
            <span>P {round(total.protein_g ?? 0)}g</span>
            <span>C {round(total.carbs_g ?? 0)}g</span>
            <span>F {round(total.fat_g ?? 0)}g</span>
          </span>
        </div>

        {hasAlternatives && (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">Totals use one option per meal — pick which to compare.</p>
            {picks.map(({ meal, option }) => (
              <div key={meal.id} className="flex items-center gap-2">
                <span className="w-28 shrink-0 truncate text-sm font-medium">{meal.label}</span>
                {meal.options.length > 1 && option ? (
                  <Select value={String(option.id)} onValueChange={(v) => onSelectOption(meal.id, Number(v))}>
                    <SelectTrigger size="sm" className="min-w-0 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meal.options.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{option?.label ?? 'No options yet'}</span>
                )}
                <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                  {option ? `${round(nutrientsFor(option).calories ?? 0)} kcal` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
