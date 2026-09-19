import { apiFetch } from './client'
import type { NewQuickLogItem, QuickLogItem } from './types'

export function listQuickLogItems(): Promise<QuickLogItem[]> {
  return apiFetch<QuickLogItem[]>('/nutrition/quick-log-items/')
}

export function createQuickLogItem(data: NewQuickLogItem): Promise<QuickLogItem> {
  return apiFetch<QuickLogItem>('/nutrition/quick-log-items/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function deleteQuickLogItem(id: number): Promise<void> {
  return apiFetch<void>(`/nutrition/quick-log-items/${id}/`, { method: 'DELETE' })
}
