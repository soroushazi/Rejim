import { apiFetch } from './client'
import type { ActivityMET } from './types'

/** Open-write reference data (any authenticated user - see ActivityMETViewSet), fetched
 * in full (Stage 1 catalog size, same "fetch in full" assumption as MuscleGroup/Exercise). */
export function listActivityMets(): Promise<ActivityMET[]> {
  return apiFetch<ActivityMET[]>('/tracker/activity-mets/')
}

export function createActivityMet(data: { name: string; met_value: string }): Promise<ActivityMET> {
  return apiFetch<ActivityMET>('/tracker/activity-mets/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
