import { useAuth } from '@/auth/AuthContext'
import { useTraineeId } from '@/lib/useTraineeId'
import GoalsSection from './goals/GoalsSection'

export default function GoalsPage() {
  const { user } = useAuth()
  const { traineeId, picker, ready } = useTraineeId()
  // Ownership flip (see accounts/permissions.py::GoalWritePermission): a
  // known traineeId means we're editing one of our trainees' goals (trainer
  // mode); with none, a trainee can only edit their own while unassigned
  // (trainer is null) - once a trainer is assigned, the trainee's own Goals
  // view goes read-only. Keying off traineeId (already viewMode-aware via
  // useTraineeId) rather than a raw role check is what makes this correct
  // for a dual-role account too.
  const canEdit = traineeId !== undefined || !!(user?.is_trainee && !user?.trainer)

  if (!ready) {
    return picker ?? <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-lg font-semibold">Goals</h1>
      {picker}
      {!canEdit && user?.is_trainee && (
        <p className="text-sm text-muted-foreground">
          Your trainer manages your goals now — reach out via Trainer → Q&amp;A if you'd like to change one.
        </p>
      )}
      <GoalsSection traineeId={traineeId} canEdit={canEdit} />
    </div>
  )
}
