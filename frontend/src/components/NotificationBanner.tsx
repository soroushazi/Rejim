import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchBannerNotifications } from '@/api/notifications'
import type { AppNotification } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'

/** Fetches not-yet-shown banner notifications once per app load (after auth
 * resolves) and marks them shown server-side in the same request - see
 * usersettings/views.py::NotificationBannerView. Dismissal here is purely
 * local (closing the strip); the backend has already recorded it as shown. */
export default function NotificationBanner() {
  const { user, loading } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  useEffect(() => {
    if (loading || !user) return
    fetchBannerNotifications()
      .then(setNotifications)
      .catch(() => setNotifications([]))
  }, [loading, user])

  function dismiss(id: number) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  if (notifications.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5 px-4 pt-2">
      {notifications.map((n) => (
        <div key={n.id} className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
          <div className="flex-1">
            <p className="font-medium">{n.title}</p>
            {n.body && <p className="text-muted-foreground">{n.body}</p>}
          </div>
          <button type="button" onClick={() => dismiss(n.id)} aria-label="Dismiss">
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>
      ))}
    </div>
  )
}
