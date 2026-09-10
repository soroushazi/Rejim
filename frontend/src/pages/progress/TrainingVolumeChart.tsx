import type { ProgressTrainingVolumeWeek } from '@/api/types'

const W = 600
const H = 160
const PAD = { top: 10, right: 14, bottom: 22, left: 44 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

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

function Bars({ weeks, valueOf, cssVar, formatValue }: {
  weeks: ProgressTrainingVolumeWeek[]
  valueOf: (w: ProgressTrainingVolumeWeek) => number
  cssVar: string
  formatValue: (v: number) => string
}) {
  const n = weeks.length
  if (n === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No data in this range yet.</p>
  }
  const { niceMax, ticks } = computeAxis(Math.max(...weeks.map(valueOf)))
  const barWidth = Math.min(40, (PLOT_W / n) * 0.6)
  const slot = PLOT_W / n

  function y(value: number) {
    return PAD.top + PLOT_H - (value / niceMax) * PLOT_H
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" role="img" aria-label="Weekly totals">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
          <text x={PAD.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground" fontSize={9}>
            {t}
          </text>
        </g>
      ))}
      {weeks.map((w, i) => {
        const value = valueOf(w)
        const cx = PAD.left + slot * i + slot / 2
        return (
          <g key={w.week_start}>
            <rect
              x={cx - barWidth / 2}
              y={y(value)}
              width={barWidth}
              height={Math.max(0, y(0) - y(value))}
              fill={`var(${cssVar})`}
              rx={2}
            >
              <title>{`Week of ${formatWeek(w.week_start)}: ${formatValue(value)}`}</title>
            </rect>
            <text x={cx} y={H - 6} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>
              {formatWeek(w.week_start)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function TrainingVolumeChart({ weeks }: { weeks: ProgressTrainingVolumeWeek[] }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold">Training volume (kg, per week)</p>
        <Bars
          weeks={weeks}
          valueOf={(w) => w.total_volume_kg}
          cssVar="--chart-1"
          formatValue={(v) => `${Math.round(v).toLocaleString()} kg`}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold">Sessions per week</p>
        <Bars weeks={weeks} valueOf={(w) => w.session_count} cssVar="--chart-2" formatValue={(v) => `${v} session${v === 1 ? '' : 's'}`} />
      </div>
    </div>
  )
}
