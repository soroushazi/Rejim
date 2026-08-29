import type { LoggedMeal } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { round } from '@/lib/utils'

export default function ProgressMealRow({ meal }: { meal: LoggedMeal }) {
  return (
    <li className="rounded-lg border border-border bg-background px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="font-medium">{meal.reference_meal_label}</span>
          {meal.source === 'plan' && meal.meal_option_label && (
            <span className="text-xs text-muted-foreground">From plan · {meal.meal_option_label}</span>
          )}
          {meal.source === 'custom' && (
            <Badge variant="destructive" className="w-fit font-normal">
              Self created
            </Badge>
          )}
        </div>
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {meal.total_nutrients.calories !== null ? round(meal.total_nutrients.calories) : '—'} kcal
        </span>
      </div>
      <ul className="mt-2 flex flex-col gap-1 border-t border-border pt-2 text-sm">
        {meal.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-2">
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.food_item_name}</span>
            <span className="whitespace-nowrap">{round(Number(item.actual_weight_grams))}g</span>
          </li>
        ))}
      </ul>
    </li>
  )
}
