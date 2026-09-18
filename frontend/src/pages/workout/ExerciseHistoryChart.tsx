import { X } from 'lucide-react'
import { useState } from 'react'
import type { ExerciseHistorySet } from '@/api/types'
import ZoomableChart, { ChartEmptyState } from '@/components/charts/ZoomableChart'
import type { PrEvent } from '@/lib/personalRecord'
import { cn } from '@/lib/utils'

type DayPoint = { date: string; maxWeight: number; avgReps: number; volume: number; weightUnit: string }
type SeriesKey = 'weight' | 'reps' | 'volume'

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

function formatDateFull(date: string) {
  const d = new Date(`${date}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

/** Dual-axis by explicit spec: weight and avg reps/set are unrelated scales
 * (not meant to be compared 1:1), so unlike the Diet Progress chart (which
 * avoided a dual axis by indexing to % of target) there's no common base to
 * index to here. Mitigated with axis-color-coding (each axis/line tinted to
 * match) and direct end labels, same mark conventions as ProgressTrendChart. */
export default function ExerciseHistoryChart({
  history,
  prEvents,
  goalWeight,
  showVolume,
  currentPr,
}: {
  history: ExerciseHistorySet[]
  /** Optional PR markers drawn on the weight line - used by the Progress tab's
   * Training dashboard (see lib/personalRecord.ts::computePrTimeline). Absent
   * for every other caller (Log-time popup, Workout Progress's history card). */
  prEvents?: PrEvent[]
  /** Optional strength-goal target weight, already converted to this chart's
   * own display unit (the most recent session's weight_unit) - draws a dashed
   * reference line, same idiom as OverviewChart's weight-goal line. */
  goalWeight?: number
  /** Adds a third toggleable "Volume" line (sum of weight x reps across a
   * day's working sets, i.e. tonnage) - a fuller picture of overall strength
   * than the weight line alone, since it also reflects how many reps/sets were
   * done at that weight. Opt-in (used by the trainer's Progress > Training >
   * Strength view) so the trainee's own simpler history view is unchanged. */
  showVolume?: boolean
  /** All-time personal record for this exercise - shown as a summary line
   * above the chart. Independent of whatever date range `history` covers, so
   * it stays accurate even when the chart itself is showing a narrower window. */
  currentPr?: { weight: number; reps: number; unit: string }
}) {
  const [visible, setVisible] = useState({ weight: true, reps: true, volume: true })
  // Stored by date (not index) so it naturally clears itself if the
  // underlying history changes (different exercise, narrower range, ...)
  // instead of pointing at a now-unrelated day.
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

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
      volume: sets.reduce((sum, s) => sum + Number(s.weight) * s.reps_done, 0),
      weightUnit: sets[0].weight_unit,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const n = days.length
  if (n === 0) {
    return <ChartEmptyState title="Exercise history" message="No working sets logged yet." />
  }

  const weightAxis = computeAxis(Math.max(...days.map((d) => d.maxWeight), goalWeight ?? 0))
  const repsAxis = computeAxis(Math.max(...days.map((d) => d.avgReps)))
  const volumeAxis = computeAxis(Math.max(...days.map((d) => d.volume)))

  const labelStep = Math.max(1, Math.ceil(n / 5))
  const dateLabelIndices = new Set(days.map((_, i) => i).filter((i) => i === 0 || i === n - 1 || i % labelStep === 0))

  function weightPath() {
    return days.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i, n).toFixed(1)},${y(d.maxWeight, weightAxis.niceMax).toFixed(1)}`).join(' ')
  }
  function repsPath() {
    return days.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i, n).toFixed(1)},${y(d.avgReps, repsAxis.niceMax).toFixed(1)}`).join(' ')
  }
  function volumePath() {
    return days.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i, n).toFixed(1)},${y(d.volume, volumeAxis.niceMax).toFixed(1)}`).join(' ')
  }

  const last = days[n - 1]
  const selectedDay = days.find((d) => d.date === selectedDate) ?? null
  const bandWidth = n > 1 ? PLOT_W / (n - 1) : PLOT_W
  const seriesToggles: { key: SeriesKey; label: string; cssVar: string }[] = [
    { key: 'weight', label: `Weight (${last.weightUnit})`, cssVar: '--chart-1' },
    { key: 'reps', label: 'Avg reps/set', cssVar: '--chart-2' },
    ...(showVolume ? [{ key: 'volume' as const, label: `Volume (${last.weightUnit})`, cssVar: '--chart-3' }] : []),
  ]

  return (
    <ZoomableChart title="Exercise history">
      <div className="flex flex-col gap-2">
      {currentPr && (
        <p className="text-sm">
          <span aria-hidden="true">🏆</span> <span className="font-semibold">PR:</span> {currentPr.weight}
          {currentPr.unit} × {currentPr.reps} reps
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {seriesToggles.map((s) => (
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

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none"
        role="img"
        aria-label={showVolume ? 'Weight, average reps per set, and volume over time' : 'Weight and average reps per set over time'}
      >
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

        {selectedDay && (
          <line
            x1={x(days.indexOf(selectedDay), n)}
            x2={x(days.indexOf(selectedDay), n)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke="var(--foreground)"
            strokeOpacity={0.15}
            strokeWidth={1}
          />
        )}
        {visible.weight && (
          <g>
            <path d={weightPath()} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {days.map((d, i) => (
              <circle key={d.date} cx={x(i, n)} cy={y(d.maxWeight, weightAxis.niceMax)} r={2.5} fill="var(--chart-1)" />
            ))}
            <text x={x(n - 1, n) + 6} y={y(last.maxWeight, weightAxis.niceMax)} dominantBaseline="middle" fontSize={9} fontWeight={600} fill="var(--chart-1)">
              {last.maxWeight}
            </text>
          </g>
        )}
        {visible.weight && goalWeight !== undefined && (
          <g>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(goalWeight, weightAxis.niceMax)}
              y2={y(goalWeight, weightAxis.niceMax)}
              stroke="var(--status-good)"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            <text x={PAD.left + 4} y={y(goalWeight, weightAxis.niceMax) - 4} textAnchor="start" fontSize={8} fill="var(--status-good)">
              Goal
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
        {showVolume && visible.volume && (
          <g>
            <path d={volumePath()} fill="none" stroke="var(--chart-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <text x={x(n - 1, n) + 6} y={y(last.volume, volumeAxis.niceMax) + 10} dominantBaseline="middle" fontSize={9} fontWeight={600} fill="var(--chart-3)">
              {Math.round(last.volume)}
            </text>
          </g>
        )}
        {visible.weight &&
          prEvents &&
          // One marker per day (not per event) - the marker sits on that day's
          // single weight-line point, so two same-day PRs (e.g. new-max-reps at
          // two different weights) would otherwise draw two identical, fully
          // overlapping markers.
          [...new Map(prEvents.map((ev) => [ev.date, ev])).values()].map((ev) => {
            const dayIndex = days.findIndex((d) => d.date === ev.date)
            if (dayIndex === -1) return null
            const cx = x(dayIndex, n)
            const cy = y(days[dayIndex].maxWeight, weightAxis.niceMax)
            const dayEvents = prEvents.filter((e) => e.date === ev.date)
            return (
              <rect
                key={ev.date}
                x={cx - 4}
                y={cy - 4}
                width={8}
                height={8}
                transform={`rotate(45 ${cx} ${cy})`}
                fill="var(--status-good)"
                stroke="var(--card)"
                strokeWidth={1.5}
              >
                <title>
                  {dayEvents.map((e) => (e.kind === 'weight' ? 'New max weight' : 'New max reps')).join(', ')} - {formatDateShort(ev.date)}
                </title>
              </rect>
            )
          })}

        {days.map((d, i) => (
          <rect
            key={`hit-${d.date}`}
            x={x(i, n) - bandWidth / 2}
            y={PAD.top}
            width={bandWidth}
            height={PLOT_H}
            fill="transparent"
            className="cursor-pointer"
            onClick={() => setSelectedDate((cur) => (cur === d.date ? null : d.date))}
          >
            <title>{formatDateFull(d.date)}</title>
          </rect>
        ))}
      </svg>

      {selectedDay && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-2.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{formatDateFull(selectedDay.date)}</span>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="flex flex-col gap-0.5 text-muted-foreground">
            <span>
              Weight: <span className="font-medium text-foreground">{selectedDay.maxWeight}{selectedDay.weightUnit}</span>
            </span>
            <span>
              Avg reps/set: <span className="font-medium text-foreground">{Math.round(selectedDay.avgReps * 10) / 10}</span>
            </span>
            {showVolume && (
              <span>
                Volume: <span className="font-medium text-foreground">{Math.round(selectedDay.volume)}{selectedDay.weightUnit}</span>
              </span>
            )}
          </div>
        </div>
      )}
      </div>
    </ZoomableChart>
  )
}
