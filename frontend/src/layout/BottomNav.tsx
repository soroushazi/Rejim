import { CalendarCheck, Dumbbell, TrendingUp, User, Users, Utensils, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/lib/utils'

type NavItem = { to: string; label: string; Icon: LucideIcon; emphasized?: boolean }

const TRAINEE_NAV_ITEMS: NavItem[] = [
  { to: '/diet', label: 'Diet', Icon: Utensils },
  { to: '/workout', label: 'Workout', Icon: Dumbbell },
  { to: '/progress', label: 'Progress', Icon: TrendingUp },
  { to: '/tracker', label: 'Daily', Icon: CalendarCheck },
  { to: '/trainer', label: 'Trainer', Icon: User },
]

// A trainer's other job here (besides managing trainees) is maintaining the
// shared Food Bank / Exercise Bank reference data - those two flank the
// trainee roster, which stays the emphasized center tab (see NavDrawer.tsx
// for the matching hamburger-menu trim, which stays just Profile).
const TRAINER_NAV_ITEMS: NavItem[] = [
  { to: '/food-bank', label: 'Food Bank', Icon: Utensils },
  { to: '/trainees', label: 'Trainees', Icon: Users, emphasized: true },
  { to: '/exercise-bank', label: 'Exercise Bank', Icon: Dumbbell },
]

export default function BottomNav() {
  const { viewMode } = useAuth()
  const items = viewMode === 'trainer' ? TRAINER_NAV_ITEMS : TRAINEE_NAV_ITEMS

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-card"
      style={{
        height: 'calc(var(--nav-height) + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {items.map(({ to, label, Icon, emphasized }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-muted-foreground',
              isActive && !emphasized && 'text-primary',
            )
          }
        >
          {({ isActive }) =>
            emphasized ? (
              <>
                <span
                  className={cn(
                    '-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-card transition-colors',
                    isActive && 'bg-primary/90',
                  )}
                >
                  <Icon className="size-6" strokeWidth={2} />
                </span>
                <span className="text-[11px] font-semibold text-primary">{label}</span>
              </>
            ) : (
              <>
                <Icon className="size-[22px]" strokeWidth={1.8} />
                <span className="text-[11px] font-medium">{label}</span>
              </>
            )
          }
        </NavLink>
      ))}
    </nav>
  )
}
