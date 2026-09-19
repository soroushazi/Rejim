import { apiFetch } from './client'
import type { UnreadSummary } from './types'

export function getUnreadSummary(): Promise<UnreadSummary> {
  return apiFetch<UnreadSummary>('/connection/unread-summary/')
}
