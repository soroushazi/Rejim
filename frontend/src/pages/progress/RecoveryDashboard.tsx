import { useEffect, useState } from 'react'
import { getProgressRecovery } from '@/api/progress'
import type { ProgressRecoveryDay } from '@/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RATING_LABELS } from '@/lib/ratings'

const W = 600
const H = 220
const PAD = { top: 14, right: 16, bottom: 22, left: 60 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

const SERIES: { key: 'sleep_quality' | 'readiness'; label: string; cssVar: string }[] = [
  { key: 'sleep_quality', label: 'Sleep quality', cssVar: '--chart-1' },
  { key: 'readiness', label: 'Readiness', cssVar: '--chart-2' },
]

function x(i: number, n: number) {
  return n <= 1 ? PAD.left + PLOT_W / 2 : PAD.left + (i / (n - 1)) * PLOT_W
}

function y(value: number) {
  return PAD.top + PLOT_H - ((value - 1) / 4) * PLOT_H
}

function formatDateShort(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function RecoveryChart({ days }: { days: ProgressRecoveryDay[] }) {
  const n = days.length
  if (n === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data in this range yet.</p>
  }

  function pathFor(key: 'sleep_quality' | 'readiness') {
    const segments: string[] = []
    let penDown = false
    days.forEach((d, i) => {
      const value = d[key]
      if (value === null) {
        penDown = false
        return
      }
      segments.push(`${penDown ? 'L' : 'M'}${x(i, n).toFixed(1)},${y(value).toFixed(1)}`)
      penDown = true
    })
    return segments.join(' ')
  }

  const labelStep = Math.max(1, Math.ceil(n / 5))
  const dateLabelIndices = new Set(days.map((_, i) => i).filter((i) => i === 0 || i === n - 1 || i % labelStep === 0))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium">
            <span className="size-2 rounded-full" style={{ backgroundColor: `var(${s.cssVar})` }} aria-hidden="true" />
            {s.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" role="img" aria-label="Sleep quality and readiness over time">
        {[1, 2, 3, 4, 5].map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground" fontSize={9}>
              {RATING_LABELS[t]}
            </text>
          </g>
        ))}
        {days.map((d, i) =>
          dateLabelIndices.has(i) ? (
            <text key={d.date} x={x(i, n)} y={H - 6} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>
              {formatDateShort(d.date)}
            </text>
          ) : null,
        )}
        {SERIES.map((s) => (
          <path key={s.key} d={pathFor(s.key)} fill="none" stroke={`var(${s.cssVar})`} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
    </div>
  )
}

type Props = {
  range: { start: string; end: string }
  traineeId?: number
}

export default function RecoveryDashboard({ range, traineeId }: Props) {
  const [days, setDays] = useState<ProgressRecoveryDay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getProgressRecovery(range, traineeId)
      .then((res) => {
        if (!cancelled) setDays(res.days)
      })
      .catch(() => {
        if (!cancelled) setDays([])
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
        <CardTitle>Recovery</CardTitle>
      </CardHeader>
      <CardContent>{loading ? <p className="text-sm text-muted-foreground">Loading…</p> : <RecoveryChart days={days} />}</CardContent>
    </Card>
  )
}
