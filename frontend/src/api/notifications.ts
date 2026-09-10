import { apiFetch } from './client'
import type { AppNotification } from './types'

export function listNotifications(): Promise<AppNotification[]> {
  return apiFetch<AppNotification[]>('/notifications/')
}

export function markNotificationRead(id: number): Promise<AppNotification> {
  return apiFetch<AppNotification>(`/notifications/${id}/mark_read/`, { method: 'POST' })
}

/** Returns not-yet-shown banner notifications and marks them shown server-side
 * in the same request - call once per app load, never poll. */
export function fetchBannerNotifications(): Promise<AppNotification[]> {
  return apiFetch<AppNotification[]>('/notifications/banner/')
}

export function getVapidPublicKey(): Promise<{ public_key: string }> {
  return apiFetch<{ public_key: string }>('/notifications/vapid-public-key/')
}

export function subscribeToPush(subscription: PushSubscriptionJSON): Promise<void> {
  return apiFetch<void>('/notifications/push-subscription/', { method: 'POST', body: JSON.stringify(subscription) })
}

export function unsubscribeFromPush(endpoint: string): Promise<void> {
  return apiFetch<void>('/notifications/push-subscription/', { method: 'DELETE', body: JSON.stringify({ endpoint }) })
}
