import { useAuth } from '@/auth/AuthContext'
import { useTraineeId } from '@/lib/useTraineeId'
import GoalsSection from './goals/GoalsSection'

export default function GoalsPage() {
  const { user } = useAuth()
  const { traineeId, trainee, picker, ready } = useTraineeId()
  // See accounts/permissions.py::GoalWritePermission - a trainee can always
  // write their own goals, and a trainer can always write their trainees'.
  // A known traineeId means we're editing one of our trainees' goals (trainer
  // mode); with none, it's a trainee editing their own. Keying off traineeId
  // (already viewMode-aware via useTraineeId) rather than a raw role check is
  // what makes this correct for a dual-role account too.
  const canEdit = traineeId !== undefined || !!user?.is_trainee
  const currentWeightKg = traineeId !== undefined ? trainee?.current_weight_kg ?? null : user?.current_weight_kg ?? null

  if (!ready) {
    return picker ?? <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-lg font-semibold">Goals</h1>
      {picker}
      <GoalsSection traineeId={traineeId} canEdit={canEdit} currentWeightKg={currentWeightKg} />
    </div>
  )
}
