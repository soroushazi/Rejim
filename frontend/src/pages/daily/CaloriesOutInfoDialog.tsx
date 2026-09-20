import { useNavigate } from 'react-router-dom'
import type { CaloriesBurnedBreakdown } from '@/api/types'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { round } from '@/lib/utils'

export default function CaloriesOutInfoDialog({
  breakdown,
  open,
  onOpenChange,
}: {
  breakdown: CaloriesBurnedBreakdown
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()

  function goToProfile() {
    onOpenChange(false)
    navigate('/profile', { state: { scrollTo: 'body-form' } })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How calories out is estimated</DialogTitle>
          <DialogDescription>
            An estimate, not a measurement - it adds up your resting metabolism, non-exercise activity from today's
            steps, logged exercise, and the thermic effect of today's food.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
            <span>
              Resting metabolism (BMR)
              {breakdown.bmr === null && (
                <span className="block text-xs text-muted-foreground">
                  Add your height, age, and weight in{' '}
                  <button
                    type="button"
                    className="font-medium text-primary underline underline-offset-2"
                    onClick={goToProfile}
                  >
                    Profile
                  </button>{' '}
                  to include this.
                </span>
              )}
            </span>
            <span className="shrink-0 font-medium">{breakdown.bmr !== null ? `${round(breakdown.bmr)} kcal` : '—'}</span>
          </li>
          <li className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
            <span>
              Non-exercise activity
              <span className="block text-xs text-muted-foreground">from today's steps</span>
            </span>
            <span className="shrink-0 font-medium">{round(breakdown.neat)} kcal</span>
          </li>
          <li className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
            <span>Logged workouts</span>
            <span className="shrink-0 font-medium">{round(breakdown.workout_calories)} kcal</span>
          </li>
          <li className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
            <span>Other logged activities</span>
            <span className="shrink-0 font-medium">{round(breakdown.activity_calories)} kcal</span>
          </li>
          <li className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
            <span>
              Thermic effect of food
              <span className="block text-xs text-muted-foreground">10% of today's logged calories</span>
            </span>
            <span className="shrink-0 font-medium">{round(breakdown.tef)} kcal</span>
          </li>
          <li className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/50 p-2.5 font-semibold">
            <span>Total</span>
            <span>{round(breakdown.total)} kcal</span>
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  )
}
