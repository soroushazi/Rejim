import { useState } from 'react'
import type { ProgressOverviewDay } from '@/api/types'
import { cn } from '@/lib/utils'

type SeriesKey = 'weight' | 'netCalories' | 'sleepHours' | 'steps' | 'water'

const W = 600
const H = 240
const BASE_MARGIN = 20
const AXIS_MARGIN = 40
const AXIS_STEP = 34
const PAD_TOP = 14
const PAD_BOTTOM = 22

// Fixed left/right allocation order, per the spec's default-on set (weight,
// net calories, sleep hours) rendering as 2-left/1-right - additional axes
// grow margins live rather than always reserving space for all 5.
const LEFT_ORDER: SeriesKey[] = ['weight', 'sleepHours', 'water']
const RIGHT_ORDER: SeriesKey[] = ['netCalories', 'steps']

const SERIES: Record<SeriesKey, { label: string; unit: string; cssVar: string }> = {
  weight: { label: 'Weight', unit: 'kg', cssVar: '--chart-1' },
  netCalories: { label: 'Net calories', unit: 'kcal', cssVar: '--chart-2' },
  sleepHours: { label: 'Sleep', unit: 'hr', cssVar: '--chart-3' },
  steps: { label: 'Steps', unit: '', cssVar: '--chart-4' },
  water: { label: 'Water', unit: 'ml', cssVar: '--chart-5' },
}

function niceStep(rawStep: number) {
  if (rawStep <= 0) return 1
  const exponent = Math.floor(Math.log10(rawStep))
  const magnitude = 10 ** exponent
  const residual = rawStep / magnitude
  const niceResidual = residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1
  return niceResidual * magnitude
}

function computeAxis(values: number[]) {
  const maxValue = Math.max(0, ...values, 1)
  const minValue = Math.min(0, ...values)
  const step = niceStep((Math.max(maxValue - minValue, 1) * 1.15) / 4)
  const niceMax = Math.ceil(maxValue / step) * step
  const niceMin = minValue < 0 ? Math.floor(minValue / step) * step : 0
  const ticks: number[] = []
  for (let v = niceMin; v <= niceMax + step * 0.001; v += step) ticks.push(Math.round(v / step) * step)
  return { niceMin, niceMax, ticks }
}

function formatDateShort(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** 7-day trailing moving average - the mean of whatever non-null values fall
 * in the 7-calendar-day window ending at i (not just the 7 most recent
 * readings), null if the window has no data at all. */
function movingAverage(values: (number | null)[], windowSize: number): (number | null)[] {
  return values.map((_, i) => {
    const windowStart = Math.max(0, i - windowSize + 1)
    const windowValues = values.slice(windowStart, i + 1).filter((v): v is number => v !== null)
    if (windowValues.length === 0) return null
    return windowValues.reduce((sum, v) => sum + v, 0) / windowValues.length
  })
}

export default function OverviewChart({ days, weightGoalKg }: { days: ProgressOverviewDay[]; weightGoalKg?: number }) {
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    weight: true,
    netCalories: true,
    sleepHours: true,
    steps: false,
    water: false,
  })

  const n = days.length
  if (n === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data in this range yet.</p>
  }

  const rawValues: Record<SeriesKey, (number | null)[]> = {
    weight: days.map((d) => d.weight_kg),
    netCalories: days.map((d) => d.net_calories),
    sleepHours: days.map((d) => d.sleep_hours),
    steps: days.map((d) => d.steps),
    water: days.map((d) => d.water_intake_ml),
  }
  const weightMA = movingAverage(rawValues.weight, 7)

  const leftVisible = LEFT_ORDER.filter((k) => visible[k])
  const rightVisible = RIGHT_ORDER.filter((k) => visible[k])
  const padLeft = leftVisible.length === 0 ? BASE_MARGIN : AXIS_MARGIN + AXIS_STEP * (leftVisible.length - 1)
  const padRight = rightVisible.length === 0 ? BASE_MARGIN : AXIS_MARGIN + AXIS_STEP * (rightVisible.length - 1)
  const plotW = W - padLeft - padRight
  const plotH = H - PAD_TOP - PAD_BOTTOM

  function x(i: number) {
    return n <= 1 ? padLeft + plotW / 2 : padLeft + (i / (n - 1)) * plotW
  }

  const axes = (Object.keys(SERIES) as SeriesKey[]).reduce(
    (acc, key) => {
      const values = rawValues[key].filter((v): v is number => v !== null)
      // Fold the weight goal into the axis's own input so the dashed target
      // line never clips off-chart, same idiom as the strength chart's goal line.
      if (key === 'weight' && weightGoalKg !== undefined) values.push(weightGoalKg)
      acc[key] = computeAxis(values)
      return acc
    },
    {} as Record<SeriesKey, ReturnType<typeof computeAxis>>,
  )

  function y(key: SeriesKey, value: number) {
    const axis = axes[key]
    const span = axis.niceMax - axis.niceMin || 1
    return PAD_TOP + plotH - ((value - axis.niceMin) / span) * plotH
  }

  function pathFor(key: SeriesKey, values: (number | null)[]) {
    const segments: string[] = []
    let penDown = false
    values.forEach((v, i) => {
      if (v === null) {
        penDown = false
        return
      }
      segments.push(`${penDown ? 'L' : 'M'}${x(i).toFixed(1)},${y(key, v).toFixed(1)}`)
      penDown = true
    })
    return segments.join(' ')
  }

  const labelStep = Math.max(1, Math.ceil(n / 5))
  const dateLabelIndices = new Set(days.map((_, i) => i).filter((i) => i === 0 || i === n - 1 || i % labelStep === 0))

  function axisX(key: SeriesKey) {
    const leftIndex = leftVisible.indexOf(key)
    if (leftIndex !== -1) return padLeft - 6 - leftIndex * AXIS_STEP
    const rightIndex = rightVisible.indexOf(key)
    return W - padRight + 6 + rightIndex * AXIS_STEP
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(SERIES) as SeriesKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setVisible((v) => ({ ...v, [key]: !v[key] }))}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity',
              visible[key] ? 'border-border text-foreground' : 'border-border text-muted-foreground opacity-50',
            )}
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: `var(${SERIES[key].cssVar})` }} aria-hidden="true" />
            {SERIES[key].label}
          </button>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" role="img" aria-label="Weight, calories, sleep, steps and water over time">
        {(Object.keys(SERIES) as SeriesKey[]).map(
          (key) =>
            visible[key] &&
            axes[key].ticks.map((t) => (
              <text
                key={`${key}-${t}`}
                x={axisX(key)}
                y={y(key, t)}
                textAnchor={LEFT_ORDER.includes(key) ? 'end' : 'start'}
                dominantBaseline="middle"
                fontSize={8}
                fill={`var(${SERIES[key].cssVar})`}
              >
                {t}
              </text>
            )),
        )}

        <line x1={padLeft} x2={W - padRight} y1={H - PAD_BOTTOM} y2={H - PAD_BOTTOM} stroke="var(--border)" strokeWidth={1} />

        {days.map((d, i) =>
          dateLabelIndices.has(i) ? (
            <text key={d.date} x={x(i)} y={H - 6} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>
              {formatDateShort(d.date)}
            </text>
          ) : null,
        )}

        {visible.weight && (
          <g>
            <path d={pathFor('weight', rawValues.weight)} fill="none" stroke="var(--chart-1)" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" opacity={0.35} />
            <path d={pathFor('weight', weightMA)} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
        {visible.weight && weightGoalKg !== undefined && (
          <g>
            <line
              x1={padLeft}
              x2={W - padRight}
              y1={y('weight', weightGoalKg)}
              y2={y('weight', weightGoalKg)}
              stroke="var(--status-good)"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            <text x={W - padRight - 4} y={y('weight', weightGoalKg) - 4} textAnchor="end" fontSize={8} fill="var(--status-good)">
              Goal
            </text>
          </g>
        )}
        {(['netCalories', 'sleepHours', 'steps', 'water'] as SeriesKey[]).map(
          (key) =>
            visible[key] && (
              <path
                key={key}
                d={pathFor(key, rawValues[key])}
                fill="none"
                stroke={`var(${SERIES[key].cssVar})`}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ),
        )}
      </svg>
    </div>
  )
}
