import { useTraineeId } from '@/lib/useTraineeId'
import ProgressDashboard from './progress/ProgressDashboard'

export default function ProgressPage() {
  const { traineeId, picker, ready } = useTraineeId()

  if (!ready) {
    return picker ?? <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {picker}
      <ProgressDashboard traineeId={traineeId} />
    </div>
  )
}
