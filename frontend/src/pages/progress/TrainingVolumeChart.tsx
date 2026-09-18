import { X } from 'lucide-react'
import { useState } from 'react'
import type { ProgressTrainingVolumeWeek } from '@/api/types'
import ZoomableChart, { ChartEmptyState } from '@/components/charts/ZoomableChart'
import { cn } from '@/lib/utils'

const W = 600
const H = 160

// Left margin has to grow with the zoomed tick-label font size or a bigger
// zoomed font clips a wide number (e.g. a 5-digit weekly volume) off the
// left edge of the viewBox instead of becoming more readable.
function padFor(zoomed: boolean) {
  return zoomed ? { top: 12, right: 16, bottom: 26, left: 56 } : { top: 10, right: 14, bottom: 22, left: 44 }
}

function niceStep(rawStep: number) {
  if (rawStep <= 0) return 1
  const exponent = Math.floor(Math.log10(rawStep))
  const magnitude = 10 ** exponent
  const residual = rawStep / magnitude
  const niceResidual = residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1
  return niceResidual * magnitude
}

function computeAxis(maxValue: number) {
  const step = niceStep((Math.max(maxValue, 1) * 1.15) / 4)
  const niceMax = Math.ceil(Math.max(maxValue, 1) / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= niceMax + step * 0.001; v += step) ticks.push(Math.round(v / step) * step)
  return { niceMax, ticks }
}

function formatWeek(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function Bars({ weeks, valueOf, cssVar, formatValue, title }: {
  weeks: ProgressTrainingVolumeWeek[]
  valueOf: (w: ProgressTrainingVolumeWeek) => number
  cssVar: string
  formatValue: (v: number) => string
  title: string
}) {
  // Stored by week (not index) so it naturally clears itself if the
  // underlying data changes (different range) instead of pointing at a
  // now-unrelated week - same idiom as ExerciseHistoryChart's selectedDate.
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)

  const n = weeks.length
  if (n === 0) {
    return <ChartEmptyState title={title} message="No data in this range yet." />
  }
  const { niceMax, ticks } = computeAxis(Math.max(...weeks.map(valueOf)))
  const selectedIndex = selectedWeek !== null ? weeks.findIndex((w) => w.week_start === selectedWeek) : -1

  return (
    <ZoomableChart title={title}>
      {(zoomed) => {
        const tickFontSize = zoomed ? 14 : 9

        const PAD = padFor(zoomed)
        const PLOT_W = W - PAD.left - PAD.right
        const PLOT_H = H - PAD.top - PAD.bottom
        const barWidth = Math.min(40, (PLOT_W / n) * 0.6)
        const slot = PLOT_W / n

        function y(value: number) {
          return PAD.top + PLOT_H - (value / niceMax) * PLOT_H
        }
        function cx(i: number) {
          return PAD.left + slot * i + slot / 2
        }

        return (
          <div className={cn('relative', zoomed && 'min-h-0 flex-1')}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className={cn('w-full select-none', zoomed && 'h-full')}
            role="img"
            aria-label="Weekly totals"
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={zoomed ? 1.5 : 1} />
                <text x={PAD.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground" fontSize={tickFontSize}>
                  {t}
                </text>
              </g>
            ))}
            {weeks.map((w, i) => {
              const value = valueOf(w)
              return (
                <g key={w.week_start}>
                  <rect
                    x={cx(i) - barWidth / 2}
                    y={y(value)}
                    width={barWidth}
                    height={Math.max(0, y(0) - y(value))}
                    fill={`var(${cssVar})`}
                    rx={2}
                    opacity={selectedIndex === -1 || selectedIndex === i ? 1 : 0.5}
                  >
                    <title>{`Week of ${formatWeek(w.week_start)}: ${formatValue(value)}`}</title>
                  </rect>
                  <text x={cx(i)} y={H - 6} textAnchor="middle" className="fill-muted-foreground" fontSize={tickFontSize}>
                    {formatWeek(w.week_start)}
                  </text>
                </g>
              )
            })}
            {weeks.map((w, i) => (
              <rect
                key={`hit-${w.week_start}`}
                x={cx(i) - slot / 2}
                y={PAD.top}
                width={slot}
                height={PLOT_H}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => setSelectedWeek((cur) => (cur === w.week_start ? null : w.week_start))}
              />
            ))}
          </svg>

          {selectedIndex !== -1 && (
            <div
              className={cn(
                'absolute top-1 z-10 flex -translate-x-1/2 flex-col gap-1 rounded-lg border border-border bg-popover px-3 py-2 shadow-lg',
                zoomed ? 'text-sm' : 'text-xs',
              )}
              style={{ left: `${Math.min(88, Math.max(12, (cx(selectedIndex) / W) * 100))}%` }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">Week of {formatWeek(weeks[selectedIndex].week_start)}</span>
                <button
                  type="button"
                  onClick={() => setSelectedWeek(null)}
                  aria-label="Close"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: `var(${cssVar})` }} aria-hidden="true" />
                <span className="font-medium">{formatValue(valueOf(weeks[selectedIndex]))}</span>
              </div>
            </div>
          )}
          </div>
        )
      }}
    </ZoomableChart>
  )
}

export default function TrainingVolumeChart({ weeks }: { weeks: ProgressTrainingVolumeWeek[] }) {
  return (
    <div className="flex flex-col gap-5">
      <Bars
        weeks={weeks}
        valueOf={(w) => w.total_volume_kg}
        cssVar="--chart-1"
        formatValue={(v) => `${Math.round(v).toLocaleString()} kg`}
        title="Training volume (kg, per week)"
      />
      <Bars
        weeks={weeks}
        valueOf={(w) => w.session_count}
        cssVar="--chart-2"
        formatValue={(v) => `${v} session${v === 1 ? '' : 's'}`}
        title="Sessions per week"
      />
    </div>
  )
}
