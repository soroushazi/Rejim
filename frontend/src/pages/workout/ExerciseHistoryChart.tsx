import { useState } from 'react'
import type { ExerciseHistorySet } from '@/api/types'
import { cn } from '@/lib/utils'

type DayPoint = { date: string; maxWeight: number; avgReps: number; weightUnit: string }

const W = 600
const H = 240
const PAD = { top: 14, right: 40, bottom: 22, left: 40 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

function computeAxis(maxValue: number) {
  const headroom = Math.max(maxValue * 1.15, 5)
  const step = headroom > 300 ? 50 : headroom > 100 ? 20 : headroom > 30 ? 5 : 2
  const niceMax = Math.ceil(headroom / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= niceMax; v += step) ticks.push(v)
  return { niceMax, ticks }
}

function x(i: number, n: number) {
  return n <= 1 ? PAD.left + PLOT_W / 2 : PAD.left + (i / (n - 1)) * PLOT_W
}

function y(value: number, niceMax: number) {
  return PAD.top + PLOT_H - (value / Math.max(niceMax, 1)) * PLOT_H
}

function formatDateShort(date: string) {
  const d = new Date(`${date}T00:00:00`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Dual-axis by explicit spec: weight and avg reps/set are unrelated scales
 * (not meant to be compared 1:1), so unlike the Diet Progress chart (which
 * avoided a dual axis by indexing to % of target) there's no common base to
 * index to here. Mitigated with axis-color-coding (each axis/line tinted to
 * match) and direct end labels, same mark conventions as ProgressTrendChart. */
export default function ExerciseHistoryChart({ history }: { history: ExerciseHistorySet[] }) {
  const [visible, setVisible] = useState({ weight: true, reps: true })

  const working = history.filter((s) => !s.is_warmup)
  const byDate = new Map<string, ExerciseHistorySet[]>()
  for (const s of working) {
    const arr = byDate.get(s.session_date) ?? []
    arr.push(s)
    byDate.set(s.session_date, arr)
  }
  const days: DayPoint[] = [...byDate.entries()]
    .map(([date, sets]) => ({
      date,
      maxWeight: Math.max(...sets.map((s) => Number(s.weight))),
      avgReps: sets.reduce((sum, s) => sum + s.reps_done, 0) / sets.length,
      weightUnit: sets[0].weight_unit,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const n = days.length
  if (n === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No working sets logged yet.</p>
  }

  const weightAxis = computeAxis(Math.max(...days.map((d) => d.maxWeight)))
  const repsAxis = computeAxis(Math.max(...days.map((d) => d.avgReps)))

  const labelStep = Math.max(1, Math.ceil(n / 5))
  const dateLabelIndices = new Set(days.map((_, i) => i).filter((i) => i === 0 || i === n - 1 || i % labelStep === 0))

  function weightPath() {
    return days.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i, n).toFixed(1)},${y(d.maxWeight, weightAxis.niceMax).toFixed(1)}`).join(' ')
  }
  function repsPath() {
    return days.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i, n).toFixed(1)},${y(d.avgReps, repsAxis.niceMax).toFixed(1)}`).join(' ')
  }

  const last = days[n - 1]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { key: 'weight' as const, label: `Weight (${last.weightUnit})`, cssVar: '--chart-1' },
            { key: 'reps' as const, label: 'Avg reps/set', cssVar: '--chart-2' },
          ]
        ).map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setVisible((v) => ({ ...v, [s.key]: !v[s.key] }))}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity',
              visible[s.key] ? 'border-border text-foreground' : 'border-border text-muted-foreground opacity-50',
            )}
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: `var(${s.cssVar})` }} aria-hidden="true" />
            {s.label}
          </button>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" role="img" aria-label="Weight and average reps per set over time">
        {visible.weight &&
          weightAxis.ticks.map((t) => (
            <text key={`wl-${t}`} x={PAD.left - 6} y={y(t, weightAxis.niceMax)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="var(--chart-1)">
              {t}
            </text>
          ))}
        {visible.reps &&
          repsAxis.ticks.map((t) => (
            <text key={`rl-${t}`} x={W - PAD.right + 6} y={y(t, repsAxis.niceMax)} textAnchor="start" dominantBaseline="middle" fontSize={9} fill="var(--chart-2)">
              {t}
            </text>
          ))}

        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top} y2={PAD.top} stroke="var(--border)" strokeWidth={1} />
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="var(--border)" strokeWidth={1} />

        {days.map((d, i) =>
          dateLabelIndices.has(i) ? (
            <text key={d.date} x={x(i, n)} y={H - 6} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>
              {formatDateShort(d.date)}
            </text>
          ) : null,
        )}

        {visible.weight && (
          <g>
            <path d={weightPath()} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <text x={x(n - 1, n) + 6} y={y(last.maxWeight, weightAxis.niceMax)} dominantBaseline="middle" fontSize={9} fontWeight={600} fill="var(--chart-1)">
              {last.maxWeight}
            </text>
          </g>
        )}
        {visible.reps && (
          <g>
            <path d={repsPath()} fill="none" stroke="var(--chart-2)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <text x={x(n - 1, n) + 6} y={y(last.avgReps, repsAxis.niceMax) - 10} dominantBaseline="middle" fontSize={9} fontWeight={600} fill="var(--chart-2)">
              {Math.round(last.avgReps * 10) / 10}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
