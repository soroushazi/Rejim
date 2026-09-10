import { useEffect, useState } from 'react'
import { getProgressTrainingVolume } from '@/api/progress'
import type { ProgressTrainingVolumeWeek } from '@/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import TrainingStrengthPanel from './TrainingStrengthPanel'
import TrainingVolumeChart from './TrainingVolumeChart'

type Props = {
  range: { start: string; end: string }
  traineeId?: number
}

export default function TrainingDashboard({ range, traineeId }: Props) {
  const [weeks, setWeeks] = useState<ProgressTrainingVolumeWeek[]>([])
  const [loading, setLoading] = useState(true)

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
