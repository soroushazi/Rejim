/** Friendly labels for the 1-5 subjective ratings (sleep quality, morning
 * readiness) - the model/API still stores a plain integer, this is presentation
 * only. Listed best-to-worst to match how a trainee would scan the dropdown. */
export const RATING_OPTIONS: { value: number; label: string }[] = [
  { value: 5, label: 'Great' },
  { value: 4, label: 'Good' },
  { value: 3, label: 'Medium' },
  { value: 2, label: 'Not good' },
  { value: 1, label: 'Poor' },
]

export const RATING_LABELS: Record<number, string> = Object.fromEntries(
  RATING_OPTIONS.map((o) => [o.value, o.label]),
)
