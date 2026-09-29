import { CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDateKey } from '@/lib/date'

/** Trainee-side notice that the trainer has scheduled a new plan version,
 * with a toggle between the current plan and a read-only preview of it. */
export default function UpcomingPlanBanner({
  effectiveFrom,
  previewing,
  onTogglePreview,
}: {
  effectiveFrom: string
  previewing: boolean
  onTogglePreview: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-3.5 py-3">
      <CalendarClock className="size-5 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-sm">
        {previewing ? (
          <>
            Previewing the plan that starts <span className="font-semibold">{formatDateKey(effectiveFrom)}</span>
          </>
        ) : (
          <>
            Your trainer updated your plan - it changes on <span className="font-semibold">{formatDateKey(effectiveFrom)}</span>
          </>
        )}
      </p>
      <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={onTogglePreview}>
        {previewing ? 'Current plan' : 'Preview'}
      </Button>
    </div>
  )
}
