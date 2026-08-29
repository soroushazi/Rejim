import type { WorkoutSessionLog } from '@/api/types'
import { toDateKey } from '@/lib/date'

/** The Monday of dateStr's ISO week, as a date key - used as the week's group key. */
function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  const daysSinceMonday = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - daysSinceMonday)
  return toDateKey(d)
}

export type StreakResult = {
  streakWeeks: number
  currentWeekCount: number
  currentWeekTarget: number
}

/** Consecutive fully-completed weeks (Monday-Sunday) that hit the plan's
 * target frequency, walking backward from last week - the current,
 * still-in-progress week is deliberately excluded from the streak count
 * itself (shown separately as "this week so far") so an early-week visit
 * doesn't look like a broken streak. */
export function computeStreak(sessions: WorkoutSessionLog[], sessionsPerWeek: number): StreakResult {
  // A target below 1 would make every week trivially "hit" (0 >= 0), turning
  // the backward walk into an infinite loop - guard it explicitly.
  if (sessionsPerWeek < 1) {
    return { streakWeeks: 0, currentWeekCount: 0, currentWeekTarget: sessionsPerWeek }
  }

  const countsByWeek = new Map<string, number>()
  for (const s of sessions) {
    const key = mondayOf(s.date)
    countsByWeek.set(key, (countsByWeek.get(key) ?? 0) + 1)
  }

  const thisWeekKey = mondayOf(toDateKey(new Date()))
  const currentWeekCount = countsByWeek.get(thisWeekKey) ?? 0

  let streakWeeks = 0
  const cursor = new Date(`${thisWeekKey}T00:00:00`)
  cursor.setDate(cursor.getDate() - 7)
  while (true) {
    const key = toDateKey(cursor)
    const count = countsByWeek.get(key) ?? 0
    if (count < sessionsPerWeek) break
    streakWeeks += 1
    cursor.setDate(cursor.getDate() - 7)
  }

  return { streakWeeks, currentWeekCount, currentWeekTarget: sessionsPerWeek }
}
