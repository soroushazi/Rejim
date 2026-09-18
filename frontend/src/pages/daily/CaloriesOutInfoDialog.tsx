import type { CaloriesBurnedBreakdown } from '@/api/types'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { round } from '@/lib/utils'

const ACTIVITY_LABEL: Record<number, string> = {
  1.2: 'sedentary',
  1.375: 'lightly active',
  1.55: 'moderately active',
  1.725: 'active',
  1.9: 'very active',
}

export default function CaloriesOutInfoDialog({
  breakdown,
  open,
  onOpenChange,
}: {
  breakdown: CaloriesBurnedBreakdown
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How calories out is estimated</DialogTitle>
          <DialogDescription>
            An estimate, not a measurement - it combines your resting metabolic rate with today's activity level and
            logged exercise.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
            <span>
              Resting metabolism (BMR)
              {breakdown.bmr === null && (
                <span className="block text-xs text-muted-foreground">
                  Add your height, age, and weight in Profile to include this.
                </span>
              )}
            </span>
            <span className="shrink-0 font-medium">{breakdown.bmr !== null ? `${round(breakdown.bmr)} kcal` : '—'}</span>
          </li>
          <li className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
            <span>
              Today's activity level
              <span className="block text-xs text-muted-foreground">
                {ACTIVITY_LABEL[breakdown.activity_multiplier] ?? 'estimated'} (×{breakdown.activity_multiplier}, from
                today's steps)
              </span>
            </span>
            <span className="shrink-0 font-medium">{breakdown.tdee !== null ? `${round(breakdown.tdee)} kcal` : '—'}</span>
          </li>
          <li className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
            <span>Logged workouts</span>
            <span className="shrink-0 font-medium">{round(breakdown.workout_calories)} kcal</span>
          </li>
          <li className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
            <span>Other logged activities</span>
            <span className="shrink-0 font-medium">{round(breakdown.activity_calories)} kcal</span>
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
