import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getTrainee } from '@/api/accounts'
import type { User } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import DietPlanEditor from './diet/plan-editor/DietPlanEditor'
import GoalsSection from './goals/GoalsSection'
import ProgressDashboard from './progress/ProgressDashboard'
import QASection from './trainer/QASection'
import TrainerPrivateNotes from './trainer/TrainerPrivateNotes'
import WorkoutPlanEditor from './trainer/workout-editor/WorkoutPlanEditor'

/** The trainer's per-trainee workspace - Diet/Workout plan editing, read-only
 * Progress, Notes & Q&A, all scoped to one trainee (see TRAINER_DASHBOARD_SPEC.md).
 * Goals renders as its own section above the tabs rather than a 5th tab -
 * the spec's tab list doesn't name one, but goal-editing still has to live
 * somewhere now that it's trainer-only (see accounts/permissions.py::GoalWritePermission). */
export default function TraineeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const traineeId = Number(id)
  const navigate = useNavigate()
  const [trainee, setTrainee] = useState<User | null>(null)

  useEffect(() => {
    getTrainee(traineeId)
      .then(setTrainee)
      .catch(() => setTrainee(null))
  }, [traineeId])

  if (!trainee) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  }

  const displayName = trainee.first_name || trainee.last_name ? `${trainee.first_name} ${trainee.last_name}`.trim() : trainee.username

  return (
    <div className="flex flex-col gap-3">
      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => navigate('/trainees')}>
        ← My Trainees
      </Button>
      <h1 className="text-lg font-semibold">{displayName}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <GoalsSection traineeId={traineeId} canEdit />
        </CardContent>
      </Card>

      <Tabs defaultValue="diet">
        <TabsList className="w-full">
          <TabsTrigger value="diet" className="flex-1">
            Diet Plan
          </TabsTrigger>
          <TabsTrigger value="workout" className="flex-1">
            Workout Plan
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex-1">
            Progress
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex-1">
            Notes &amp; Q&amp;A
          </TabsTrigger>
        </TabsList>
        <TabsContent value="diet" className="mt-3">
          <DietPlanEditor traineeId={traineeId} />
        </TabsContent>
        <TabsContent value="workout" className="mt-3">
          <WorkoutPlanEditor traineeId={traineeId} />
        </TabsContent>
        <TabsContent value="progress" className="mt-3">
          <ProgressDashboard traineeId={traineeId} />
        </TabsContent>
        <TabsContent value="notes" className="mt-3">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Private Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <TrainerPrivateNotes traineeId={traineeId} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Q&amp;A</CardTitle>
              </CardHeader>
              <CardContent>
                <QASection traineeId={traineeId} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
