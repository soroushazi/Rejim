import { apiFetch } from './client'
import type { TraineeListFilters, TraineeListRow } from './types'

export function listTraineeRoster(filters: TraineeListFilters = {}): Promise<TraineeListRow[]> {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.trend) params.set('trend', filters.trend)
  if (filters.lowConsistency) params.set('low_consistency', 'true')
  if (filters.inactiveDays) params.set('inactive_days', String(filters.inactiveDays))
  const query = params.toString()
  return apiFetch<TraineeListRow[]>(`/trainer/trainees/${query ? `?${query}` : ''}`)
}
