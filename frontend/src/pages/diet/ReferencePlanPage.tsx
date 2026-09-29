import { getDietPlan, getDietPlanForDate } from '@/api/dietPlan'
import UpcomingPlanBanner from '@/components/plans/UpcomingPlanBanner'
import { useTodaysPlan } from '@/components/plans/useTodaysPlan'
import DietPlanView from './DietPlanView'

export default function ReferencePlanPage() {
  const { loading, error, upcoming, previewing, shown, togglePreview } = useTodaysPlan(getDietPlanForDate, getDietPlan)

  if (loading) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  }
  if (error) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">Couldn't load the diet plan.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {upcoming?.effective_from && (
        <UpcomingPlanBanner effectiveFrom={upcoming.effective_from} previewing={previewing} onTogglePreview={togglePreview} />
      )}
      {shown ? (
        <DietPlanView plan={shown} />
      ) : previewing ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <p className="mt-6 text-center text-sm text-muted-foreground">No diet plan yet.</p>
      )}
    </div>
  )
}
