/** RPE is stored server-side as a free 1-10 int, but logging exposes it as a
 * qualitative dropdown - simpler to log than picking an exact number. Each
 * label maps to one representative value on the 1-10 scale. */
export const RPE_OPTIONS = [
  { value: 5, label: 'Easy' },
  { value: 7, label: 'Medium' },
  { value: 9, label: 'Hard' },
  { value: 10, label: 'Muscle failure' },
] as const

/** Older logs (or ones edited elsewhere) may hold a value with no exact
 * label match - fall back to the plain number rather than hide it. */
export function rpeLabel(value: number | null): string | null {
  if (value === null) return null
  return RPE_OPTIONS.find((o) => o.value === value)?.label ?? `RPE ${value}`
}
