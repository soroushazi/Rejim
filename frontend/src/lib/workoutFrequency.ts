import type { WorkoutSessionLog } from '@/api/types'

export type FrequencyStats = { avgGapDays: number; avgRestDays: number }

/** Average gap (days) between consecutive session dates, and the average rest
 * days between them (gap - 1: the days off that fall strictly between two
 * training days, e.g. Mon -> Wed is a 2-day gap but 1 rest day, Tuesday).
 * Needs at least 2 distinct session dates. */
export function computeFrequency(sessions: WorkoutSessionLog[]): FrequencyStats | null {
  const dates = [...new Set(sessions.map((s) => s.date))].sort()
  if (dates.length < 2) return null

  const gaps: number[] = []
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(`${dates[i - 1]}T00:00:00`)
    const curr = new Date(`${dates[i]}T00:00:00`)
    gaps.push((curr.getTime() - prev.getTime()) / 86_400_000)
  }
  const avgGapDays = gaps.reduce((a, b) => a + b, 0) / gaps.length
  return { avgGapDays, avgRestDays: Math.max(0, avgGapDays - 1) }
}
