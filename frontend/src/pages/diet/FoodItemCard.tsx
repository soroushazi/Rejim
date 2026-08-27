import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { reviewFoodItem } from '../../api/foodItems'
import type { FoodItem } from '../../api/types'
import { SERVING_UNIT_NOUN } from '@/lib/servingUnits'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MICRO_FIELDS: { key: keyof FoodItem; label: string; unit: string }[] = [
  { key: 'fiber_g_per_100g', label: 'Fiber', unit: 'g' },
  { key: 'sugar_g_per_100g', label: 'Sugar', unit: 'g' },
  { key: 'sodium_mg_per_100g', label: 'Sodium', unit: 'mg' },
  { key: 'potassium_mg_per_100g', label: 'Potassium', unit: 'mg' },
  { key: 'calcium_mg_per_100g', label: 'Calcium', unit: 'mg' },
  { key: 'iron_mg_per_100g', label: 'Iron', unit: 'mg' },
  { key: 'vitamin_c_mg_per_100g', label: 'Vitamin C', unit: 'mg' },
  { key: 'vitamin_a_mcg_per_100g', label: 'Vitamin A', unit: 'mcg' },
]

function round(value: number) {
  return Number.isInteger(value) ? value : Math.round(value * 10) / 10
}

export default function FoodItemCard({
  item,
  onUpdated,
}: {
  item: FoodItem
  onUpdated: (item: FoodItem) => void
}) {
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const isOwner = user?.id === item.created_by
  const isTrainer = user?.role === 'trainer'

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

  async function handleReview(approval_status: 'approved' | 'rejected') {
    setReviewing(true)
    try {
      onUpdated(await reviewFoodItem(item.id, approval_status))
    } finally {
      setReviewing(false)
    }
  }

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full flex-col gap-1.5 px-3.5 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex flex-wrap items-center gap-1.5 font-semibold">
            {item.name}
            {item.kind === 'composite' && (
              <Badge variant="secondary" className="font-normal">
                Recipe
              </Badge>
            )}
            {item.visibility === 'private' && (
              <Badge variant="outline" className="font-normal">
                Private
              </Badge>
            )}
            {item.visibility === 'public' && item.approval_status === 'pending' && (
              <Badge className="font-normal">Pending approval</Badge>
            )}
            {item.visibility === 'public' && item.approval_status === 'rejected' && (
              <Badge variant="destructive" className="font-normal">
                Rejected
              </Badge>
            )}
          </span>
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {scaled(item.calories_per_100g)} kcal
          </span>
        </div>
        <div className="flex gap-3 text-sm text-muted-foreground">
          <span>P {scaled(item.protein_g_per_100g)}g</span>
          <span>C {scaled(item.carbs_g_per_100g)}g</span>
          <span>F {scaled(item.fat_g_per_100g)}g</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {servingCaption}
          {(isOwner || isTrainer) && item.created_by_username ? ` · by ${item.created_by_username}` : ''}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border px-3.5 py-3">
          <p className="mb-1.5 text-xs text-muted-foreground">{servingCaption}</p>
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
            <div className="mt-3 border-t border-border pt-3">
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

          {isTrainer && item.visibility === 'public' && item.approval_status !== 'approved' && (
            <div className={cn('mt-3 flex gap-2 border-t border-border pt-3')}>
              <Button size="sm" disabled={reviewing} onClick={() => handleReview('approved')}>
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={reviewing}
                onClick={() => handleReview('rejected')}
              >
                Reject
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}
