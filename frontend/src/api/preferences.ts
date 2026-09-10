import { apiFetch } from './client'
import type { UserPreference } from './types'

export function getPreferences(): Promise<UserPreference> {
  return apiFetch<UserPreference>('/preferences/')
}

export function updatePreferences(data: Partial<UserPreference>): Promise<UserPreference> {
  return apiFetch<UserPreference>('/preferences/', { method: 'PATCH', body: JSON.stringify(data) })
}
