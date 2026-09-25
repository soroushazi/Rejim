/** The 8pm-based display scale used to chart "time went to bed" (DailyMetric.bedtime,
 * a plain "HH:MM:SS" time-of-day with no date) alongside the 1-5 sleep quality /
 * readiness ratings - in the Daily Tracker and Progress -> Recovery's bedtime
 * scatter plots. A bedtime naturally spans midnight (most bedtimes are "late
 * evening" through "early morning"), so it's remapped to "hours after 8pm",
 * wrapping past midnight: 8pm itself is 0, midnight is 4, 6am is 10. Purely a
 * client-side visualization concern (see backend ProgressRecoveryView's own doc
 * comment) - the raw time is what's stored and sent over the API. */
export const BEDTIME_SCALE_BASE_HOUR = 20 // 8pm, 24h clock

function formatClockTime(hour24: number): string {
  const normalized = ((hour24 % 24) + 24) % 24
  const wholeHour = Math.floor(normalized + 1e-9) % 24
  const minute = Math.round((normalized - wholeHour) * 60) % 60
  const period = wholeHour < 12 ? 'AM' : 'PM'
  const hour12 = wholeHour % 12 === 0 ? 12 : wholeHour % 12
  return minute === 0 ? `${hour12} ${period}` : `${hour12}:${String(minute).padStart(2, '0')} ${period}`
}

/** Hours after 8pm (0 up to just under 24, wrapping past midnight) for a raw
 * "HH:MM[:SS]" bedtime - e.g. "00:00" (midnight) -> 4, "06:00" -> 10. */
export function bedtimeToScale(bedtime: string): number {
  const [h, m] = bedtime.split(':').map(Number)
  const hours = h + m / 60
  const delta = hours - BEDTIME_SCALE_BASE_HOUR
  return delta < 0 ? delta + 24 : delta
}

/** The inverse of bedtimeToScale, as a short clock-time label (e.g. "8 PM",
 * "12 AM", "2:30 AM") - for chart axis ticks. */
export function scaleToClockLabel(hoursAfter8pm: number): string {
  return formatClockTime(BEDTIME_SCALE_BASE_HOUR + hoursAfter8pm)
}

/** A raw "HH:MM[:SS]" bedtime formatted as a friendly clock time (e.g. "11:45 PM"). */
export function formatBedtime(bedtime: string): string {
  const [h, m] = bedtime.split(':').map(Number)
  return formatClockTime(h + m / 60)
}
