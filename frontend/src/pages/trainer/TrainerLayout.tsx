import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useTrainerUnreadCounts } from '@/lib/useTrainerUnreadCounts'

export default function TrainerLayout() {
  const { notesUnread, qaUnread } = useTrainerUnreadCounts()
  const subTabs = [
    { to: '/trainer/notes', label: 'Notes', unread: notesUnread },
    { to: '/trainer/qa', label: 'Q&A', unread: qaUnread },
  ]

  return (
    <div className="-mx-4">
      <div
        className="sticky z-10 bg-background px-4 pb-3 pt-3"
        style={{ top: 'calc(var(--header-height) + env(safe-area-inset-top))' }}
      >
        <div className="flex rounded-full bg-muted p-1 shadow-sm ring-1 ring-border/60">
          {subTabs.map(({ to, label, unread }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-center text-[13px] font-semibold transition-colors',
                  isActive ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {label}
              {unread > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="px-4">
        <Outlet />
      </div>
    </div>
  )
}
