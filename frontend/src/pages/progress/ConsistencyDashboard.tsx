import { useEffect, useState } from 'react'
import { getProgressConsistency } from '@/api/progress'
import type { ProgressConsistencyResponse } from '@/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  range: { start: string; end: string }
  traineeId?: number
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border p-3">
      <span className="text-2xl font-semibold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export default function ConsistencyDashboard({ range, traineeId }: Props) {
  const [data, setData] = useState<ProgressConsistencyResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getProgressConsistency(range, traineeId)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch(() => {
        if (!cancelled) setData(null)
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
    <Card>
      <CardHeader>
        <CardTitle>Consistency</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && !data && <p className="text-sm text-muted-foreground">Couldn't load consistency stats.</p>}
        {data && (
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Days with a daily metric logged" value={`${data.daily_metric_pct}%`} />
            <StatTile label="Days with a workout session logged" value={`${data.workout_session_pct}%`} />
            <StatTile label="Days with a food log entry" value={`${data.diet_log_pct}%`} />
            <StatTile label="Current streak" value={`${data.current_streak_days} day${data.current_streak_days === 1 ? '' : 's'}`} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
