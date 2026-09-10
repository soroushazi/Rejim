import { getVapidPublicKey, subscribeToPush as postSubscription, unsubscribeFromPush as deleteSubscription } from '@/api/notifications'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Push simply won't work if this fails - not fatal to the rest of the app.
    })
  }
}

/** Requests notification permission, subscribes this browser to Web Push, and
 * registers the subscription with the backend. Called when a user turns
 * channel_push on for the first time on the Reminders page. */
export async function subscribeToPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const registration = await navigator.serviceWorker.ready
  const { public_key } = await getVapidPublicKey()
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(public_key) as BufferSource,
  })
  await postSubscription(subscription.toJSON())
  return true
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await deleteSubscription(subscription.endpoint)
  await subscription.unsubscribe()
}
