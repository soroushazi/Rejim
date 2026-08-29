import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

const SUB_TABS = [
  { to: '/workout/log', label: 'Log' },
  { to: '/workout/progress', label: 'Progress' },
  { to: '/workout/plan', label: 'Plan' },
  { to: '/workout/exercises', label: 'Exercises' },
]

export default function WorkoutLayout() {
  return (
    <div className="-mx-4">
      <div
        className="sticky z-10 bg-background px-4 pb-3 pt-3"
        style={{ top: 'var(--header-height)' }}
      >
        <div className="flex rounded-full bg-muted p-1 shadow-sm ring-1 ring-border/60">
          {SUB_TABS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex-1 rounded-full py-1.5 text-center text-[13px] font-semibold transition-colors',
                  isActive ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {label}
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
