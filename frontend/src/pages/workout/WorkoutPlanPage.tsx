import { getWorkoutPlan, getWorkoutPlanForDate } from '@/api/workoutPlans'
import UpcomingPlanBanner from '@/components/plans/UpcomingPlanBanner'
import { useTodaysPlan } from '@/components/plans/useTodaysPlan'
import WorkoutPlanView from './WorkoutPlanView'

export default function WorkoutPlanPage() {
  const { loading, error, upcoming, previewing, shown, togglePreview } = useTodaysPlan(
    getWorkoutPlanForDate,
    getWorkoutPlan,
  )

  if (loading) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  }
  if (error) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">Couldn't load your workout plan.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {upcoming?.effective_from && (
        <UpcomingPlanBanner effectiveFrom={upcoming.effective_from} previewing={previewing} onTogglePreview={togglePreview} />
      )}
      {shown ? (
        <WorkoutPlanView plan={shown} />
      ) : previewing ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <p className="mt-6 text-center text-sm text-muted-foreground">No workout plan yet.</p>
      )}
    </div>
  )
}
