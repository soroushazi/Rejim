import { useState, type MouseEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { deleteLoggedMeal } from '@/api/loggedMeals'
import type { LoggedMeal, ReferenceMealDetail } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import ConfirmDialog from '@/components/ConfirmDialog'
import { formatBedtime as formatTimeOfDay } from '@/lib/bedtime'
import { cn, round } from '@/lib/utils'
import LoggedMealDetailDialog from './LoggedMealDetailDialog'
import PlannedMealDetailDialog from './PlannedMealDetailDialog'

/** Slot-card tint by logged state: off-plan (any custom item) reads as a
 * warning (reddish), fully on-plan or plan+off-plan both read as a confirmed
 * match to the trainer's plan (purplish, the brand color), and not-yet-logged
 * stays neutral (no distinct "did they follow the plan?" signal to give yet). */
function slotClassName(source: LoggedMeal['source'] | undefined) {
  if (source === 'custom') return 'overflow-hidden rounded-lg border border-destructive/40 bg-destructive/5'
  if (source === 'plan' || source === 'mixed') return 'overflow-hidden rounded-lg border border-primary/40 bg-primary/5'
  return 'overflow-hidden rounded-lg border border-border bg-background'
}

type Props = {
  meal: ReferenceMealDetail
  date: string
  loggedMeal: LoggedMeal | null
  onCleared: (referenceMealId: number) => void
}

/** A meal slot's collapsed summary row - logging/editing itself happens on its
 * own dedicated page (LogMealPage), reached via "Log this meal"/"Edit" below,
 * so a trainee can freely mix plan items, food-bank swaps, and quick-log
 * shortcuts in one log without a cramped inline card. */
export default function LogMealSlot({ meal, date, loggedMeal, onCleared }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canLog = user?.is_trainee
  const [clearing, setClearing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Tapping the card anywhere opens its full breakdown (what was logged, or
  // the plan's options if nothing is yet) - except its own buttons
  // (remove/edit/log), and clicks bubbling up through React from a portaled
  // dialog, which aren't inside this card's DOM at all.
  function handleCardClick(e: MouseEvent<HTMLLIElement>) {
    const target = e.target as HTMLElement
    if (!e.currentTarget.contains(target) || target.closest('button')) return
    setDetailOpen(true)
  }

  async function handleClear() {
    if (!loggedMeal) return
    setClearing(true)
    setError(null)
    try {
      await deleteLoggedMeal(loggedMeal.id)
      onCleared(meal.id)
    } catch {
      setError('Could not remove this log.')
    } finally {
      setClearing(false)
    }
  }

  return (
    <li className={cn(slotClassName(loggedMeal?.source), 'cursor-pointer')} onClick={handleCardClick}>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-medium">
            {meal.label}
            {loggedMeal?.eaten_at && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {formatTimeOfDay(loggedMeal.eaten_at)}
              </span>
            )}
          </span>
          {loggedMeal?.source === 'plan' && loggedMeal.meal_option_label && (
            <span className="text-xs text-muted-foreground">From plan · {loggedMeal.meal_option_label}</span>
          )}
          {loggedMeal?.source === 'custom' && (
            <Badge variant="destructive" className="w-fit font-normal">
              Off plan
            </Badge>
          )}
          {loggedMeal?.source === 'mixed' && (
            <Badge variant="secondary" className="w-fit font-normal">
              Plan + off plan
            </Badge>
          )}
          {!loggedMeal && <span className="text-xs text-muted-foreground">Not logged yet</span>}
        </div>
        <div className="flex items-center gap-2">
          {canLog && loggedMeal && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              disabled={clearing}
              aria-label={`Remove logged ${meal.label}`}
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
          {canLog && (
            <Button type="button" size="sm" variant="outline" onClick={() => navigate(`/diet/log/${date}/${meal.id}`)}>
              {loggedMeal ? 'Edit' : 'Log this meal'}
            </Button>
          )}
        </div>
      </div>

      {loggedMeal && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t border-border/60 px-3 py-2 text-sm">
          <span className="font-medium">
            {loggedMeal.total_nutrients.calories !== null ? round(loggedMeal.total_nutrients.calories) : '—'} kcal
          </span>
          <span className="text-muted-foreground">P {round(loggedMeal.total_nutrients.protein_g ?? 0)}g</span>
          <span className="text-muted-foreground">C {round(loggedMeal.total_nutrients.carbs_g ?? 0)}g</span>
          <span className="text-muted-foreground">F {round(loggedMeal.total_nutrients.fat_g ?? 0)}g</span>
        </div>
      )}

      {error && <p className="px-3 pb-2 text-sm text-destructive">{error}</p>}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Remove your logged ${meal.label.toLowerCase()}?`}
        onConfirm={handleClear}
      />

      {loggedMeal ? (
        <LoggedMealDetailDialog open={detailOpen} onOpenChange={setDetailOpen} meal={loggedMeal} />
      ) : (
        <PlannedMealDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          meal={meal}
          onLog={canLog ? () => navigate(`/diet/log/${date}/${meal.id}`) : undefined}
        />
      )}
    </li>
  )
}
