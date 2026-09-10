import { apiFetch } from './client'
import type { DailySummary } from './types'

export function getDailySummary(date: string): Promise<DailySummary> {
  return apiFetch<DailySummary>(`/tracker/daily-summary/?date=${date}`)
}
