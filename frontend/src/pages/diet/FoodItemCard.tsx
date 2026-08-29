import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { reviewFoodItem } from '../../api/foodItems'
import type { DietaryTag, FoodItem, MacroFilter } from '../../api/types'
import { SERVING_UNIT_NOUN } from '@/lib/servingUnits'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { round } from '@/lib/utils'
import FoodItemDetailDialog from './FoodItemDetailDialog'
import FoodItemNutritionFacts from './FoodItemNutritionFacts'

export default function FoodItemCard({
  item,
  macroFilters,
  dietaryTags,
  onUpdated,
}: {
  item: FoodItem
  macroFilters: MacroFilter[]
  dietaryTags: DietaryTag[]
  onUpdated: (item: FoodItem) => void
}) {
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
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
        <div className="flex flex-col gap-3 border-t border-border px-3.5 py-3">
          <FoodItemNutritionFacts item={item} macroFilters={macroFilters} dietaryTags={dietaryTags} />

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setDetailOpen(true)}
          >
            See alternatives
          </Button>

          {isTrainer && item.visibility === 'public' && item.approval_status !== 'approved' && (
            <div className="flex gap-2 border-t border-border pt-3">
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

      <FoodItemDetailDialog
        item={detailOpen ? item : null}
        macroFilters={macroFilters}
        dietaryTags={dietaryTags}
        onOpenChange={setDetailOpen}
      />
    </li>
  )
}
