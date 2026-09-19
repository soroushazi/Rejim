import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { deleteLoggedMeal } from '@/api/loggedMeals'
import type { LoggedMeal, ReferenceMealDetail } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import ConfirmDialog from '@/components/ConfirmDialog'
import { round } from '@/lib/utils'

/** Slot-card tint by logged state: off-plan (any custom item) reads as a
 * warning (reddish), fully on-plan reads as a confirmed match to the
 * trainer's plan (purplish, the brand color), and mixed/not-yet-logged stay
 * neutral (no distinct "did they follow the plan?" signal to give yet). */
function slotClassName(source: LoggedMeal['source'] | undefined) {
  if (source === 'custom') return 'overflow-hidden rounded-lg border border-destructive/40 bg-destructive/5'
  if (source === 'plan') return 'overflow-hidden rounded-lg border border-primary/40 bg-primary/5'
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
    <li className={slotClassName(loggedMeal?.source)}>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex flex-col gap-1">
          <span className="font-medium">{meal.label}</span>
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
          {loggedMeal && (
            <span className="whitespace-nowrap text-sm text-muted-foreground">
              {loggedMeal.total_nutrients.calories !== null ? round(loggedMeal.total_nutrients.calories) : '—'} kcal
            </span>
          )}
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

      {error && <p className="px-3 pb-2 text-sm text-destructive">{error}</p>}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Remove your logged ${meal.label.toLowerCase()}?`}
        onConfirm={handleClear}
      />
    </li>
  )
}
