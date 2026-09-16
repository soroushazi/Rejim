import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

type NavDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MENU_ITEMS = [
  { to: '/profile', label: 'Profile' },
  { to: '/goals', label: 'Goals' },
  { to: '/plan-management', label: 'Plan Management' },
  { to: '/preferences', label: 'Units & Preferences' },
  { to: '/reminders', label: 'Reminders' },
  { to: '/export', label: 'Data Export' },
]

// Trainer-only - the first role-conditional item in this menu, shown only in
// trainee view mode (trainer mode's own menu is trimmed to just Profile
// below - this item lives in the bottom nav's "Trainees" tab instead). For a
// dual-role account this is their way back into the trainer dashboard.
const TRAINER_MENU_ITEMS = [{ to: '/trainees', label: 'My Trainees' }]

// "Settings" (name/password) is the only thing left to offer here once
// Diet/Workout/Daily-adjacent items (Goals, Plan Management, Preferences,
// Reminders, Data Export) don't apply - Trainees/Food Bank/Exercise Bank live
// in the bottom nav instead (see BottomNav.tsx TRAINER_NAV_ITEMS).
const TRAINER_MODE_MENU_ITEMS = [{ to: '/profile', label: 'Profile' }]

export default function NavDrawer({ open, onOpenChange }: NavDrawerProps) {
  const { user, viewMode, logout, setViewMode } = useAuth()
  const navigate = useNavigate()
  const items =
    viewMode === 'trainer' ? TRAINER_MODE_MENU_ITEMS : user?.is_trainer ? [...TRAINER_MENU_ITEMS, ...MENU_ITEMS] : MENU_ITEMS
  const roleLabel = [user?.is_trainer && 'trainer', user?.is_trainee && 'trainee'].filter(Boolean).join(' · ')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-3/4 sm:max-w-xs"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <SheetHeader style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
          <SheetTitle className="text-left">
            {user && (
              <span className="flex flex-col gap-0.5">
                <span className="text-base font-semibold text-foreground">{user.username}</span>
                <span className="text-xs font-normal capitalize text-muted-foreground">{roleLabel}</span>
              </span>
            )}
          </SheetTitle>
        </SheetHeader>
        <Separator />
        <div className="flex flex-col px-4">
          {items.map((item) => (
            <Button
              key={item.to}
              variant="ghost"
              className="justify-start px-2"
              onClick={() => {
                onOpenChange(false)
                if (item.to === '/trainees') {
                  // Dual-role accounts can also reach this via "Log my own
                  // training" in trainee mode - clicking back in here should
                  // always land in the trainer dashboard, not wherever
                  // viewMode was last left.
                  setViewMode('trainer')
                }
                navigate(item.to)
              }}
            >
              {item.label}
            </Button>
          ))}
          <Separator className="my-1" />
          <Button variant="ghost" className="justify-start px-2 text-destructive" onClick={logout}>
            Log out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
