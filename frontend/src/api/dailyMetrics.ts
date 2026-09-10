import { apiFetch } from './client'
import type { DailyMetric, NewDailyMetric } from './types'

export function listDailyMetrics(date: string): Promise<DailyMetric[]> {
  return apiFetch<DailyMetric[]>(`/tracker/daily-metrics/?date=${date}`)
}

/** Always posts the complete current state for the selected date; the backend
 * upserts on (trainee, date) - same convention as saveLoggedMeal/saveWorkoutSession. */
export function saveDailyMetric(data: NewDailyMetric): Promise<DailyMetric> {
  return apiFetch<DailyMetric>('/tracker/daily-metrics/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
