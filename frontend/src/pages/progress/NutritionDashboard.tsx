import { useEffect, useState } from 'react'
import { getProgressNutrition } from '@/api/progress'
import type { ProgressNutritionResponse } from '@/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ProgressSummaryCard from '@/pages/diet/ProgressSummaryCard'
import { averageNutrients } from '@/lib/nutrients'
import MacroTrendChart from './MacroTrendChart'

type Props = {
  range: { start: string; end: string }
  traineeId?: number
}

export default function NutritionDashboard({ range, traineeId }: Props) {
  const [data, setData] = useState<ProgressNutritionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setHoverIndex(null)
    getProgressNutrition(range, traineeId)
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

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }
  if (!data) {
    return <p className="text-sm text-muted-foreground">Couldn't load nutrition progress.</p>
  }
  if (!data.target) {
    return <p className="text-sm text-muted-foreground">No diet plan set yet - nothing to compare against.</p>
  }

  const days = data.days
  const hovered = hoverIndex !== null ? days[hoverIndex] : null
  const periodAverage = averageNutrients(days.map((d) => d.consumed))
  const heading = hovered
    ? new Date(`${hovered.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    : 'Range average'

  return (
    <div className="flex flex-col gap-3">
      <ProgressSummaryCard heading={heading} nutrients={hovered ? hovered.consumed : periodAverage} target={data.target} />

      <Card>
        <CardHeader>
          <CardTitle>Calories &amp; macros vs. target</CardTitle>
        </CardHeader>
        <CardContent>
          <MacroTrendChart
            days={days.map((d) => ({ date: d.date, nutrients: d.consumed }))}
            target={data.target}
            hoverIndex={hoverIndex}
            onHoverChange={setHoverIndex}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Diet adherence</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{data.adherence_pct}%</p>
          <p className="text-sm text-muted-foreground">of days in this range have at least one food log entry.</p>
        </CardContent>
      </Card>
    </div>
  )
}
