import { useEffect, useState } from 'react'
import { getProgressTrainingVolume } from '@/api/progress'
import type { ProgressTrainingVolumeWeek, WorkoutSessionLog } from '@/api/types'
import { listWorkoutSessions } from '@/api/workoutSessions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SessionHistoryCard from '../workout/SessionHistoryCard'
import TrainingStrengthPanel from './TrainingStrengthPanel'
import TrainingVolumeChart from './TrainingVolumeChart'

type Props = {
  range: { start: string; end: string }
  traineeId?: number
}

export default function TrainingDashboard({ range, traineeId }: Props) {
  const [weeks, setWeeks] = useState<ProgressTrainingVolumeWeek[]>([])
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<WorkoutSessionLog[]>([])

  // Unbounded, not tied to `range` - same independence SessionHistoryDialog
  // already documents for itself: browsing history shouldn't move the
  // numbers in the cards below, and vice versa.
  useEffect(() => {
    listWorkoutSessions(traineeId)
      .then(setSessions)
      .catch(() => setSessions([]))
  }, [traineeId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getProgressTrainingVolume(range, traineeId)
      .then((res) => {
        if (!cancelled) setWeeks(res.weeks)
      })
      .catch(() => {
        if (!cancelled) setWeeks([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end, traineeId])

  return (
    <div className="flex flex-col gap-3">
      <SessionHistoryCard sessions={sessions} />

      <Card>
        <CardHeader>
          <CardTitle>Strength</CardTitle>
        </CardHeader>
        <CardContent>
          <TrainingStrengthPanel range={range} traineeId={traineeId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Volume &amp; frequency</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : <TrainingVolumeChart weeks={weeks} />}
        </CardContent>
      </Card>
    </div>
  )
}
