/** Total ms on a pausable timer: whatever earlier (paused) runs added up to,
 * plus the current run if it's going (`startedAt` epoch ms, null while paused
 * or idle). */
export function timerElapsedMs(accumulatedMs: number, startedAt: number | null, now: number): number {
  return accumulatedMs + (startedAt !== null ? Math.max(0, now - startedAt) : 0)
}

/** Whole minutes in `ms`, rounded to the nearest minute - shared by the
 * workout timer's live auto-update and its freeze on Pause/Save, so both
 * agree on the same rounding. */
export function minutesFromMs(ms: number): number {
  return Math.max(0, Math.round(ms / 60000))
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
