import { useEffect, useState } from 'react'
import { listFoodItemAlternatives } from '@/api/foodItems'
import type { DietaryTag, FoodItem, MacroFilter } from '@/api/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { round } from '@/lib/utils'
import FoodItemNutritionFacts from './FoodItemNutritionFacts'

type Props = {
  item: FoodItem | null
  macroFilters: MacroFilter[]
  dietaryTags: DietaryTag[]
  onOpenChange: (open: boolean) => void
}

/** Nutrition facts for one food item, plus an "Alternatives" list of nutritionally
 * comparable items (see FoodItemViewSet.alternatives) - clicking an alternative
 * swaps this same dialog to show its facts and its own alternatives in turn, so a
 * trainee can hop from substitute to substitute without leaving the popup. */
export default function FoodItemDetailDialog({ item, macroFilters, dietaryTags, onOpenChange }: Props) {
  const [current, setCurrent] = useState<FoodItem | null>(item)
  const [alternatives, setAlternatives] = useState<FoodItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setCurrent(item)
  }, [item])

  useEffect(() => {
    if (!current) return
    let cancelled = false
    setLoading(true)
    listFoodItemAlternatives(current.id)
      .then((data) => {
        if (!cancelled) setAlternatives(data)
      })
      .catch(() => {
        if (!cancelled) setAlternatives([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [current?.id])

  return (
    <Dialog open={item !== null} onOpenChange={(next) => !next && onOpenChange(false)}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{current?.name ?? 'Food item'}</DialogTitle>
        </DialogHeader>

        {current && (
          <div className="flex flex-col gap-4">
            <FoodItemNutritionFacts item={current} macroFilters={macroFilters} dietaryTags={dietaryTags} />

            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Alternatives</p>
              {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
              {!loading && alternatives.length === 0 && (
                <p className="text-sm text-muted-foreground">No comparable alternatives found.</p>
              )}
              {!loading && alternatives.length > 0 && (
                <ul className="flex flex-col overflow-hidden rounded-lg border border-border">
                  {alternatives.map((alt) => (
                    <li key={alt.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => setCurrent(alt)}
                      >
                        <span className="min-w-0 flex-1 truncate">{alt.name}</span>
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {round(Number(alt.calories_per_100g))} kcal
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
