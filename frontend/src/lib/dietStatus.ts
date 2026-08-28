export type NutrientStatus = 'good' | 'bad' | 'neutral'

/** Green at 90-110% of the planned daily calories, reddish otherwise. */
export function caloriesStatus(actual: number, planned: number): NutrientStatus {
  if (!planned) return 'neutral'
  const pct = (actual / planned) * 100
  return pct >= 90 && pct <= 110 ? 'good' : 'bad'
}

/** Reddish only when under 90% of planned protein; fine at or above target. */
export function proteinStatus(actual: number, planned: number): NutrientStatus {
  if (!planned) return 'neutral'
  const pct = (actual / planned) * 100
  return pct < 90 ? 'bad' : 'good'
}

export const STATUS_TEXT_CLASS: Record<NutrientStatus, string> = {
  good: 'text-emerald-600 dark:text-emerald-400',
  bad: 'text-destructive',
  neutral: 'text-muted-foreground',
}
