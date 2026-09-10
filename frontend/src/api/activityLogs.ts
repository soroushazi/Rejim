import { apiFetch } from './client'
import type { ActivityLogEntry, NewActivityLogEntry } from './types'

export function listActivityLogs(date: string): Promise<ActivityLogEntry[]> {
  return apiFetch<ActivityLogEntry[]>(`/tracker/activity-logs/?date=${date}`)
}

export function createActivityLog(data: NewActivityLogEntry): Promise<ActivityLogEntry> {
  return apiFetch<ActivityLogEntry>('/tracker/activity-logs/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateActivityLog(id: number, data: NewActivityLogEntry): Promise<ActivityLogEntry> {
  return apiFetch<ActivityLogEntry>(`/tracker/activity-logs/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteActivityLog(id: number): Promise<void> {
  return apiFetch<void>(`/tracker/activity-logs/${id}/`, { method: 'DELETE' })
}
