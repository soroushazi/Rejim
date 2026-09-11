import type { LoggedMeal } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { round } from '@/lib/utils'

export default function ProgressMealRow({ meal }: { meal: LoggedMeal }) {
  return (
    <li className="min-w-0 rounded-lg border border-border bg-background px-3 py-2.5">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-medium">{meal.reference_meal_label}</span>
          {meal.source === 'plan' && meal.meal_option_label && (
            <span className="truncate text-xs text-muted-foreground">From plan · {meal.meal_option_label}</span>
          )}
          {meal.source === 'custom' && (
            <Badge variant="destructive" className="w-fit font-normal">
              Self created
            </Badge>
          )}
        </div>
        <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">
          {meal.total_nutrients.calories !== null ? round(meal.total_nutrients.calories) : '—'} kcal
        </span>
      </div>
      <ul className="mt-2 flex min-w-0 flex-col gap-1.5 border-t border-border pt-2 text-sm">
        {meal.items.map((item) => (
          <li key={item.id} className="flex min-w-0 flex-col gap-0.5">
            <div className="flex min-w-0 justify-between gap-2">
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.food_item_name}</span>
              <span className="shrink-0 whitespace-nowrap">{round(Number(item.actual_weight_grams))}g</span>
            </div>
            <span className="break-words text-xs text-muted-foreground">
              {item.actual_nutrients.calories !== null ? round(item.actual_nutrients.calories) : '—'} kcal · P{' '}
              {round(item.actual_nutrients.protein_g ?? 0)}g · C {round(item.actual_nutrients.carbs_g ?? 0)}g · F{' '}
              {round(item.actual_nutrients.fat_g ?? 0)}g
            </span>
          </li>
        ))}
      </ul>
    </li>
  )
}
