import { X } from 'lucide-react'
import { useState } from 'react'
import type { Nutrients } from '@/api/types'
import ZoomableChart, { ChartEmptyState } from '@/components/charts/ZoomableChart'
import { cn } from '@/lib/utils'

export type SeriesKey = 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'

type DayPoint = { date: string; nutrients: Nutrients }

type Props = {
  days: DayPoint[]
  target: Nutrients
  hoverIndex: number | null
  onHoverChange: (index: number | null) => void
}

const SERIES: { key: SeriesKey; label: string; short: string; unit: string; cssVar: string }[] = [
  { key: 'calories', label: 'Calories', short: 'Cal', unit: 'kcal', cssVar: '--chart-1' },
  { key: 'protein_g', label: 'Protein', short: 'P', unit: 'g', cssVar: '--chart-2' },
  { key: 'carbs_g', label: 'Carbs', short: 'C', unit: 'g', cssVar: '--chart-3' },
  { key: 'fat_g', label: 'Fat', short: 'F', unit: 'g', cssVar: '--chart-4' },
]

const W = 600
const H = 240

// Right margin has to grow with the zoomed tick-label font size ("100%" plus
// the "Target" label) or a bigger zoomed font clips off the viewBox edge
// instead of becoming more readable.
function padFor(zoomed: boolean) {
  return zoomed ? { top: 16, right: 40, bottom: 26, left: 46 } : { top: 14, right: 30, bottom: 22, left: 30 }
}

function percentOf(actual: number | null, target: number | null): number | null {
  if (actual === null || !target) return null
  return (actual / target) * 100
}

function computeYAxis(maxValue: number) {
  const headroom = Math.max(maxValue, 110)
  const step = headroom > 300 ? 100 : headroom > 150 ? 50 : 25
  const niceMax = Math.ceil(headroom / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= niceMax; v += step) ticks.push(v)
  return { niceMax, ticks }
}

function formatDateShort(date: string) {
  const d = new Date(`${date}T00:00:00`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatDateFull(date: string) {
  const d = new Date(`${date}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function ProgressTrendChart({ days, target, hoverIndex, onHoverChange }: Props) {
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    calories: true,
    protein_g: true,
    carbs_g: true,
    fat_g: true,
  })

  const n = days.length
  const series = SERIES.map((s) => ({
    ...s,
    points: days.map((d, i) => ({ i, value: percentOf(d.nutrients[s.key], target[s.key]) })),
  }))

  const maxValue = Math.max(
    100,
    ...series.flatMap((s) => (visible[s.key] ? s.points.map((p) => p.value ?? 0) : [])),
  )
  const { niceMax, ticks } = computeYAxis(maxValue)

  const labelStep = Math.max(1, Math.ceil(n / 5))
  const dateLabelIndices = new Set(
    days.map((_, i) => i).filter((i) => i === 0 || i === n - 1 || i % labelStep === 0),
  )

  if (n === 0) {
    return <ChartEmptyState title="Nutrient trend" message="No logged days in this period yet." />
  }

  return (
    <ZoomableChart title="Nutrient trend">
      {(zoomed) => {
        const tickFontSize = zoomed ? 14 : 9
        const endLabelFontSize = zoomed ? 13 : 9
        const thinStroke = zoomed ? 1.5 : 1
        const targetStroke = zoomed ? 2 : 1.5
        const lineStroke = zoomed ? 3 : 2
        const hoverRadius = zoomed ? 6 : 4

        const PAD = padFor(zoomed)
        const PLOT_W = W - PAD.left - PAD.right
        const PLOT_H = H - PAD.top - PAD.bottom
        const hitSlot = n > 1 ? PLOT_W / (n - 1) : PLOT_W

        function x(i: number) {
          return n <= 1 ? PAD.left + PLOT_W / 2 : PAD.left + (i / (n - 1)) * PLOT_W
        }
        function y(value: number) {
          return PAD.top + PLOT_H - (value / niceMax) * PLOT_H
        }
        function pathFor(points: { i: number; value: number | null }[]) {
          const segments: string[] = []
          let penDown = false
          for (const p of points) {
            if (p.value === null) {
              penDown = false
              continue
            }
            const command = penDown ? 'L' : 'M'
            segments.push(`${command}${x(p.i).toFixed(1)},${y(p.value).toFixed(1)}`)
            penDown = true
          }
          return segments.join(' ')
        }

        return (
          <div className={cn('flex flex-col gap-2', zoomed && 'h-full min-h-0')}>
            <div className={cn('flex flex-wrap gap-1.5', zoomed && 'justify-center')}>
              {SERIES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setVisible((v) => ({ ...v, [s.key]: !v[s.key] }))}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium transition-opacity',
                    zoomed ? 'text-sm' : 'text-xs',
                    visible[s.key] ? 'border-border text-foreground' : 'border-border text-muted-foreground opacity-50',
                  )}
                >
                  <span className="size-2 rounded-full" style={{ backgroundColor: `var(${s.cssVar})` }} aria-hidden="true" />
                  {s.label}
                </button>
              ))}
            </div>

            <div className={cn('relative', zoomed && 'min-h-0 flex-1')}>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className={cn('w-full touch-none select-none', zoomed && 'h-full')}
              role="img"
              aria-label="Nutrient trend, as percent of daily target"
            >
              {ticks.map((t) => (
                <g key={t}>
                  <line
                    x1={PAD.left}
                    x2={W - PAD.right}
                    y1={y(t)}
                    y2={y(t)}
                    stroke={t === 100 ? 'var(--status-good)' : 'var(--border)'}
                    strokeWidth={t === 100 ? targetStroke : thinStroke}
                    strokeDasharray={t === 100 ? '4 3' : undefined}
                    opacity={t === 100 ? 0.75 : 1}
                  />
                  <text x={PAD.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground" fontSize={tickFontSize}>
                    {t}%
                  </text>
                  {t === 100 && (
                    <text x={W - PAD.right} y={y(t) - 4} textAnchor="end" className="fill-muted-foreground" fontSize={tickFontSize} fontWeight={600}>
                      Target
                    </text>
                  )}
                </g>
              ))}

              {days.map((d, i) =>
                dateLabelIndices.has(i) ? (
                  <text key={d.date} x={x(i)} y={H - 6} textAnchor="middle" className="fill-muted-foreground" fontSize={tickFontSize}>
                    {formatDateShort(d.date)}
                  </text>
                ) : null,
              )}

              {series
                .filter((s) => visible[s.key])
                .map((s) => {
                  const lastPoint = [...s.points].reverse().find((p) => p.value !== null)
                  return (
                    <g key={s.key}>
                      <path d={pathFor(s.points)} fill="none" stroke={`var(${s.cssVar})`} strokeWidth={lineStroke} strokeLinecap="round" strokeLinejoin="round" />
                      {lastPoint && lastPoint.value !== null && (
                        <text x={x(lastPoint.i) + 6} y={y(lastPoint.value)} dominantBaseline="middle" className="fill-muted-foreground" fontSize={endLabelFontSize} fontWeight={600}>
                          {s.short}
                        </text>
                      )}
                    </g>
                  )
                })}

              {hoverIndex !== null && (
                <g>
                  <line x1={x(hoverIndex)} x2={x(hoverIndex)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--muted-foreground)" strokeWidth={thinStroke} />
                  {series
                    .filter((s) => visible[s.key])
                    .map((s) => {
                      const value = s.points[hoverIndex]?.value
                      if (value === null || value === undefined) return null
                      return <circle key={s.key} cx={x(hoverIndex)} cy={y(value)} r={hoverRadius} fill={`var(${s.cssVar})`} stroke="var(--card)" strokeWidth={lineStroke} />
                    })}
                </g>
              )}

              {days.map((d, i) => (
                <rect
                  key={`hit-${d.date}`}
                  x={x(i) - hitSlot / 2}
                  y={PAD.top}
                  width={hitSlot}
                  height={PLOT_H}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => onHoverChange(hoverIndex === i ? null : i)}
                />
              ))}
            </svg>

            {hoverIndex !== null && (
              <div
                className={cn(
                  'absolute top-1 z-10 flex -translate-x-1/2 flex-col gap-1 rounded-lg border border-border bg-popover px-3 py-2 shadow-lg',
                  zoomed ? 'text-sm' : 'text-xs',
                )}
                style={{ left: `${Math.min(88, Math.max(12, (x(hoverIndex) / W) * 100))}%` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{formatDateFull(days[hoverIndex].date)}</span>
                  <button
                    type="button"
                    onClick={() => onHoverChange(null)}
                    aria-label="Close"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </div>
                {SERIES.filter((s) => visible[s.key]).map((s) => {
                  const value = days[hoverIndex].nutrients[s.key]
                  if (value === null) return null
                  return (
                    <div key={s.key} className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: `var(${s.cssVar})` }} aria-hidden="true" />
                      <span className="text-muted-foreground">{s.label}:</span>
                      <span className="font-medium">{Math.round(value)} {s.unit}</span>
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
