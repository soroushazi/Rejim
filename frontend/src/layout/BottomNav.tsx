import { CalendarCheck, Dumbbell, TrendingUp, User, Utensils } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/diet', label: 'Diet', Icon: Utensils },
  { to: '/workout', label: 'Workout', Icon: Dumbbell },
  { to: '/progress', label: 'Progress', Icon: TrendingUp },
  { to: '/tracker', label: 'Daily', Icon: CalendarCheck },
  { to: '/trainer', label: 'Trainer', Icon: User },
]

export default function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-card"
      style={{
        height: 'calc(var(--nav-height) + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {NAV_ITEMS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-muted-foreground',
              isActive && 'text-primary',
            )
          }
        >
          <Icon className="size-[22px]" strokeWidth={1.8} />
          <span className="text-[11px] font-medium">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
