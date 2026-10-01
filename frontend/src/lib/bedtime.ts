/** The 8pm-based display scale used to chart "time went to bed" (DailyMetric.bedtime,
 * a plain "HH:MM:SS" time-of-day with no date) alongside the 1-5 sleep quality /
 * readiness ratings - in the Daily Tracker and Progress -> Recovery's bedtime
 * scatter plots. A bedtime naturally spans midnight (most bedtimes are "late
 * evening" through "early morning"), so it's remapped to "hours after 8pm",
 * wrapping past midnight: 8pm itself is 0, midnight is 4, 6am is 10. Purely a
 * client-side visualization concern (see backend ProgressRecoveryView's own doc
 * comment) - the raw time is what's stored and sent over the API. */
export const BEDTIME_SCALE_BASE_HOUR = 20 // 8pm, 24h clock

/** Progress -> Recovery's last-meal scatter plots use the same idea from 6pm:
 * 6pm is 0, midnight is 6. Unlike bedtime, only times before 4am wrap past
 * midnight - a last meal at 5pm is genuinely earlier than the axis start (a
 * negative value, which the chart extends its axis down to), not a meal at
 * 5pm the next day. Matches the backend's LAST_MEAL_WRAP_HOUR. */
export const LAST_MEAL_SCALE_BASE_HOUR = 18 // 6pm
export const LAST_MEAL_WRAP_HOUR = 4

function formatClockTime(hour24: number): string {
  const normalized = ((hour24 % 24) + 24) % 24
  const wholeHour = Math.floor(normalized + 1e-9) % 24
  const minute = Math.round((normalized - wholeHour) * 60) % 60
  const period = wholeHour < 12 ? 'AM' : 'PM'
  const hour12 = wholeHour % 12 === 0 ? 12 : wholeHour % 12
  return minute === 0 ? `${hour12} ${period}` : `${hour12}:${String(minute).padStart(2, '0')} ${period}`
}

/** Hours after `baseHour` for a raw "HH:MM[:SS]" time, where anything before
 * `wrapBeforeHour` counts as past midnight (+24h). Bedtime passes its base hour
 * for both (nothing is ever negative: "00:00" -> 4, "06:00" -> 10). */
export function timeToScale(time: string, baseHour: number, wrapBeforeHour: number): number {
  const [h, m] = time.split(':').map(Number)
  const hours = h + m / 60
  return hours - baseHour + (hours < wrapBeforeHour ? 24 : 0)
}

/** The inverse of timeToScale, as a short clock-time label (e.g. "8 PM",
 * "12 AM", "2:30 AM") - for chart axis ticks. */
export function scaleToClockLabel(hoursAfter8pm: number, baseHour: number = BEDTIME_SCALE_BASE_HOUR): string {
  return formatClockTime(baseHour + hoursAfter8pm)
}

/** A raw "HH:MM[:SS]" bedtime formatted as a friendly clock time (e.g. "11:45 PM"). */
export function formatBedtime(bedtime: string): string {
  const [h, m] = bedtime.split(':').map(Number)
  return formatClockTime(h + m / 60)
}
