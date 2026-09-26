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

  function goToActiveEnergy() {
    onOpenChange(false)
    // Same page (Daily tab) - no navigation needed, just scroll the
    // already-mounted Metrics card's field into view, mirroring Profile's
    // scrollTo-a-section deep link without needing router state for it.
    window.setTimeout(() => {
      document.getElementById('daily-active-energy-field')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 0)
  }

  const addActiveEnergyLink = (
    <button type="button" className="font-medium text-primary underline underline-offset-2" onClick={goToActiveEnergy}>
      Metrics
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How calories out is estimated</DialogTitle>
          <DialogDescription>
            An estimate, not a measurement - it adds up your resting metabolism, today's movement, and the thermic
            effect of today's food. Movement uses whichever data you've given: your watch's daily Active Energy
            total when you've entered one, or your logged workouts/activities plus whatever steps aren't already
            covered by one of them, or just your steps if nothing else was logged.
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

          {breakdown.tier === 1 && (
            <li className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
              <span>
                Active energy
                <span className="block text-xs text-muted-foreground">from your watch</span>
              </span>
              <span className="shrink-0 font-medium">{round(breakdown.active_energy ?? 0)} kcal</span>
            </li>
          )}

          {breakdown.tier === 2 && (
            <>
              <li className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
                <span>
                  Logged workouts/activities
                  <span className="block text-xs text-muted-foreground">from your watch</span>
                </span>
                <span className="shrink-0 font-medium">{round(breakdown.logged_activity_calories ?? 0)} kcal</span>
              </li>
              <li className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
                <span>
                  Remaining steps
                  <span className="block text-xs text-muted-foreground">
                    today's steps not already covered by a logged activity above
                  </span>
                </span>
                <span className="shrink-0 font-medium">{round(breakdown.neat ?? 0)} kcal</span>
              </li>
              <li className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
                Enter today's total in {addActiveEnergyLink} instead for a more precise estimate, if your watch
                reports one.
              </li>
            </>
          )}

          {breakdown.tier === 3 && (
            <>
              <li className="flex items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5">
                <span>
                  Steps-based estimate
                  <span className="block text-xs text-muted-foreground">
                    no workout/activity calories logged today - lower-confidence than a device total
                  </span>
                </span>
                <span className="shrink-0 font-medium">{round(breakdown.neat ?? 0)} kcal</span>
              </li>
              <li className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
                Enter today's total in {addActiveEnergyLink}, or log a workout/activity's calories, for a more
                precise estimate.
              </li>
            </>
          )}

          <li className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
            <span>
              Thermic effect of food
              <span className="block text-xs text-muted-foreground">10% of today's logged calories</span>
            </span>
            <span className="shrink-0 font-medium">{round(breakdown.tef)} kcal</span>
          </li>
          <li className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/50 p-2.5 font-semibold">
            <span>
              Total
              {breakdown.tier === 3 && <span className="block text-xs font-normal text-muted-foreground">estimate</span>}
            </span>
            <span>{round(breakdown.total)} kcal</span>
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  )
}
