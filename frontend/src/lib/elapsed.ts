/** Whole minutes elapsed since `startedAt` (epoch ms), rounded to the
 * nearest minute - shared by the workout timer's live auto-update and its
 * final freeze on Stop/Save, so both agree on the same rounding. */
export function minutesElapsed(startedAt: number, now: number): number {
  return Math.max(0, Math.round((now - startedAt) / 60000))
}

/** "MM:SS", or "H:MM:SS" past an hour - a live elapsed-time readout, not a
 * clock time. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}
