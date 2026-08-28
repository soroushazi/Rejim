import { useState } from 'react'
import type { MealOptionDetail } from '@/api/types'
import { round } from '@/lib/utils'
import IngredientNutrientDialog from './IngredientNutrientDialog'

export default function PlanOptionRow({ option, letter }: { option: MealOptionDetail; letter: string }) {
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<{ id: number; weight: number } | null>(null)
  const { nutrients } = option
  const heading = option.label ? `Option ${letter}) ${option.label}` : `Option ${letter}`

  return (
    <li className="overflow-hidden rounded-lg border border-border bg-background">
      <button
        type="button"
        className="flex w-full flex-col gap-1 px-3 py-2.5 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium">{heading}</span>
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {nutrients.calories !== null ? `${round(nutrients.calories)} kcal` : '—'}
          </span>
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>P {nutrients.protein_g !== null ? round(nutrients.protein_g) : '—'}g</span>
          <span>C {nutrients.carbs_g !== null ? round(nutrients.carbs_g) : '—'}g</span>
          <span>F {nutrients.fat_g !== null ? round(nutrients.fat_g) : '—'}g</span>
        </div>
      </button>

      {expanded && (
        <ul className="flex flex-col gap-1 border-t border-border px-3 py-2.5 text-sm">
          {option.items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full justify-between gap-2 rounded-md py-0.5 text-left"
                onClick={() =>
                  setSelected({ id: item.food_item, weight: Number(item.reference_weight_grams) })
                }
              >
                <span className="underline decoration-dotted underline-offset-2">{item.food_item_name}</span>
                <span className="whitespace-nowrap text-muted-foreground">
                  {round(Number(item.reference_weight_grams))}g
                  {item.reference_nutrients.calories !== null
                    ? ` · ${round(item.reference_nutrients.calories)} kcal`
                    : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <IngredientNutrientDialog
        foodItemId={selected?.id ?? null}
        defaultWeightGrams={selected?.weight ?? 0}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      />
    </li>
  )
}
