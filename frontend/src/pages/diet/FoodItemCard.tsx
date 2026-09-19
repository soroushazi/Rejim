import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { reviewFoodItem } from '../../api/foodItems'
import type { DietaryTag, FoodItem, FoodItemEditRequest, MacroFilter } from '../../api/types'
import { defaultMeasure } from '@/lib/servingUnits'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { round } from '@/lib/utils'
import FoodItemDetailDialog from './FoodItemDetailDialog'
import FoodItemNutritionFacts from './FoodItemNutritionFacts'

export default function FoodItemCard({
  item,
  macroFilters,
  dietaryTags,
  editRequests,
  onUpdated,
  onEdit,
  onRequestEdit,
  onResolveRequest,
}: {
  item: FoodItem
  macroFilters: MacroFilter[]
  dietaryTags: DietaryTag[]
  editRequests: FoodItemEditRequest[]
  onUpdated: (item: FoodItem) => void
  onEdit: () => void
  onRequestEdit: () => void
  onResolveRequest: (id: number) => void
}) {
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const isOwner = user?.id === item.created_by
  const isTrainer = user?.is_trainer
  const canEdit = !!(isTrainer || isOwner)
  const pendingRequests = editRequests.filter((r) => r.status === 'pending')

  const measure = defaultMeasure(item)
  const servingGrams = measure ? Number(measure.grams_per_unit) : null
  const factor = servingGrams ? servingGrams / 100 : 1
  const servingCaption = measure ? `Per ${measure.label} (${servingGrams}g)` : 'Per 100g'

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
            {item.brand_name && (
              <span className="font-normal text-muted-foreground">({item.brand_name})</span>
            )}
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
            {item.visibility === 'trainees' && (
              <Badge variant="outline" className="font-normal">
                My Trainees
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

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={canEdit ? onEdit : onRequestEdit}>
              {canEdit ? 'Edit food item' : 'Request edit'}
            </Button>

            {isTrainer && pendingRequests.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">Edit requests</p>
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex flex-col gap-1.5 rounded-lg border border-border p-2.5 text-sm">
                    <p>{req.description}</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">from {req.requested_by_username}</span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => onResolveRequest(req.id)}>
                        Mark resolved
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!canEdit && pendingRequests.length > 0 && (
              <p className="text-xs text-muted-foreground">Your edit request is pending review.</p>
            )}
          </div>
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
