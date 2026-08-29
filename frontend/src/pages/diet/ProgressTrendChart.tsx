import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { Nutrients } from '@/api/types'
import { cn } from '@/lib/utils'

export type SeriesKey = 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'

type DayPoint = { date: string; nutrients: Nutrients }

type Props = {
  days: DayPoint[]
  target: Nutrients
  hoverIndex: number | null
  onHoverChange: (index: number | null) => void
}

const SERIES: { key: SeriesKey; label: string; short: string; cssVar: string }[] = [
  { key: 'calories', label: 'Calories', short: 'Cal', cssVar: '--chart-1' },
  { key: 'protein_g', label: 'Protein', short: 'P', cssVar: '--chart-2' },
  { key: 'carbs_g', label: 'Carbs', short: 'C', cssVar: '--chart-3' },
  { key: 'fat_g', label: 'Fat', short: 'F', cssVar: '--chart-4' },
]

const W = 600
const H = 240
const PAD = { top: 14, right: 30, bottom: 22, left: 30 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

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

function x(i: number, n: number) {
  return n <= 1 ? PAD.left + PLOT_W / 2 : PAD.left + (i / (n - 1)) * PLOT_W
}

function y(value: number, niceMax: number) {
  return PAD.top + PLOT_H - (value / niceMax) * PLOT_H
}

function formatDateShort(date: string) {
  const d = new Date(`${date}T00:00:00`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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

  function pathFor(points: { i: number; value: number | null }[]) {
    const segments: string[] = []
    let penDown = false
    for (const p of points) {
      if (p.value === null) {
        penDown = false
        continue
      }
      const command = penDown ? 'L' : 'M'
      segments.push(`${command}${x(p.i, n).toFixed(1)},${y(p.value, niceMax).toFixed(1)}`)
      penDown = true
    }
    return segments.join(' ')
  }

  function handlePointer(e: ReactPointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const index = Math.round(ratio * (n - 1))
    onHoverChange(Math.min(n - 1, Math.max(0, index)))
  }

  const labelStep = Math.max(1, Math.ceil(n / 5))
  const dateLabelIndices = new Set(
    days.map((_, i) => i).filter((i) => i === 0 || i === n - 1 || i % labelStep === 0),
  )

  if (n === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No logged days in this period yet.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {SERIES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setVisible((v) => ({ ...v, [s.key]: !v[s.key] }))}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity',
              visible[s.key] ? 'border-border text-foreground' : 'border-border text-muted-foreground opacity-50',
            )}
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: `var(${s.cssVar})` }}
              aria-hidden="true"
            />
            {s.label}
          </button>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none select-none" role="img" aria-label="Nutrient trend, as percent of daily target">
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t, niceMax)}
              y2={y(t, niceMax)}
              stroke={t === 100 ? 'var(--status-good)' : 'var(--border)'}
              strokeWidth={t === 100 ? 1.5 : 1}
              strokeDasharray={t === 100 ? '4 3' : undefined}
              opacity={t === 100 ? 0.75 : 1}
            />
            <text x={PAD.left - 6} y={y(t, niceMax)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground" fontSize={9}>
              {t}%
            </text>
            {t === 100 && (
              <text
                x={W - PAD.right}
                y={y(t, niceMax) - 4}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize={9}
                fontWeight={600}
              >
                Target
              </text>
            )}
          </g>
        ))}

        {days.map((d, i) =>
          dateLabelIndices.has(i) ? (
            <text
              key={d.date}
              x={x(i, n)}
              y={H - 6}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={9}
            >
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
                <path
                  d={pathFor(s.points)}
                  fill="none"
                  stroke={`var(${s.cssVar})`}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {lastPoint && lastPoint.value !== null && (
                  <text
                    x={x(lastPoint.i, n) + 6}
                    y={y(lastPoint.value, niceMax)}
                    dominantBaseline="middle"
                    className="fill-muted-foreground"
                    fontSize={9}
                    fontWeight={600}
                  >
                    {s.short}
                  </text>
                )}
              </g>
            )
          })}

        {hoverIndex !== null && (
          <g>
            <line
              x1={x(hoverIndex, n)}
              x2={x(hoverIndex, n)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="var(--muted-foreground)"
              strokeWidth={1}
            />
            {series
              .filter((s) => visible[s.key])
              .map((s) => {
                const value = s.points[hoverIndex]?.value
                if (value === null || value === undefined) return null
                return (
                  <circle
                    key={s.key}
                    cx={x(hoverIndex, n)}
                    cy={y(value, niceMax)}
                    r={4}
                    fill={`var(${s.cssVar})`}
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                )
              })}
          </g>
        )}

        <rect
          x={PAD.left}
          y={PAD.top}
          width={PLOT_W}
          height={PLOT_H}
          fill="transparent"
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => onHoverChange(null)}
        />
      </svg>
    </div>
  )
}
