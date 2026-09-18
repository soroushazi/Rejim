import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getProgressRecovery } from '@/api/progress'
import type { ProgressRecoveryDay } from '@/api/types'
import ZoomableChart, { ChartEmptyState } from '@/components/charts/ZoomableChart'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
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

function formatDateFull(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function RecoveryChart({ days }: { days: ProgressRecoveryDay[] }) {
  // Stored by date (not index) so it naturally clears itself if the
  // underlying data changes (different range) instead of pointing at a
  // now-unrelated day - same idiom as ExerciseHistoryChart's selectedDate.
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const n = days.length
  if (n === 0) {
    return <ChartEmptyState title="Recovery" message="No data in this range yet." />
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

  const selectedIndex = selectedDate !== null ? days.findIndex((d) => d.date === selectedDate) : -1
  const hitSlot = n > 1 ? PLOT_W / (n - 1) : PLOT_W

  return (
    <ZoomableChart title="Recovery">
      {(zoomed) => {
        const tickFontSize = zoomed ? 14 : 9
        const thinStroke = zoomed ? 1.5 : 1
        const lineStroke = zoomed ? 3 : 2

        return (
          <div className={cn('flex flex-col gap-2', zoomed && 'h-full min-h-0')}>
            <div className={cn('flex flex-wrap gap-1.5', zoomed && 'justify-center')}>
              {SERIES.map((s) => (
                <span
                  key={s.key}
                  className={cn('flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-medium', zoomed ? 'text-sm' : 'text-xs')}
                >
                  <span className="size-2 rounded-full" style={{ backgroundColor: `var(${s.cssVar})` }} aria-hidden="true" />
                  {s.label}
                </span>
              ))}
            </div>
            <div className={cn('relative', zoomed && 'min-h-0 flex-1')}>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className={cn('w-full select-none', zoomed && 'h-full')}
              role="img"
              aria-label="Sleep quality and readiness over time"
            >
              {[1, 2, 3, 4, 5].map((t) => (
                <g key={t}>
                  <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={thinStroke} />
                  <text x={PAD.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground" fontSize={tickFontSize}>
                    {RATING_LABELS[t]}
                  </text>
                </g>
              ))}
              {days.map((d, i) =>
                dateLabelIndices.has(i) ? (
                  <text key={d.date} x={x(i, n)} y={H - 6} textAnchor="middle" className="fill-muted-foreground" fontSize={tickFontSize}>
                    {formatDateShort(d.date)}
                  </text>
                ) : null,
              )}
              {SERIES.map((s) => (
                <path key={s.key} d={pathFor(s.key)} fill="none" stroke={`var(${s.cssVar})`} strokeWidth={lineStroke} strokeLinecap="round" strokeLinejoin="round" />
              ))}

              {selectedIndex !== -1 && (
                <g>
                  <line
                    x1={x(selectedIndex, n)}
                    x2={x(selectedIndex, n)}
                    y1={PAD.top}
                    y2={H - PAD.bottom}
                    stroke="var(--foreground)"
                    strokeOpacity={0.15}
                    strokeWidth={thinStroke}
                  />
                  {SERIES.map((s) => {
                    const value = days[selectedIndex][s.key]
                    if (value === null) return null
                    return (
                      <circle
                        key={s.key}
                        cx={x(selectedIndex, n)}
                        cy={y(value)}
                        r={zoomed ? 5 : 3.5}
                        fill={`var(${s.cssVar})`}
                        stroke="var(--card)"
                        strokeWidth={1.5}
                      />
                    )
                  })}
                </g>
              )}

              {days.map((d, i) => (
                <rect
                  key={`hit-${d.date}`}
                  x={x(i, n) - hitSlot / 2}
                  y={PAD.top}
                  width={hitSlot}
                  height={PLOT_H}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => setSelectedDate((cur) => (cur === d.date ? null : d.date))}
                />
              ))}
            </svg>

            {selectedIndex !== -1 && (
              <div
                className={cn(
                  'absolute top-1 z-10 flex -translate-x-1/2 flex-col gap-1 rounded-lg border border-border bg-popover px-3 py-2 shadow-lg',
                  zoomed ? 'text-sm' : 'text-xs',
                )}
                style={{ left: `${Math.min(88, Math.max(12, (x(selectedIndex, n) / W) * 100))}%` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{formatDateFull(days[selectedIndex].date)}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    aria-label="Close"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </div>
                {SERIES.map((s) => {
                  const value = days[selectedIndex][s.key]
                  if (value === null) return null
                  return (
                    <div key={s.key} className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: `var(${s.cssVar})` }} aria-hidden="true" />
                      <span className="text-muted-foreground">{s.label}:</span>
                      <span className="font-medium">{RATING_LABELS[value]}</span>
                    </div>
                  )
                })}
              </div>
            )}
            </div>
          </div>
        )
      }}
    </ZoomableChart>
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
      <CardContent>
        {loading ? <ChartEmptyState title="Recovery" message="Loading…" /> : <RecoveryChart days={days} />}
      </CardContent>
    </Card>
  )
}
