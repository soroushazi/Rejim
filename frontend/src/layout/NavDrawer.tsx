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

export default function NavDrawer({ open, onOpenChange }: NavDrawerProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-3/4 sm:max-w-xs">
        <SheetHeader>
          <SheetTitle className="text-left">
            {user && (
              <span className="flex flex-col gap-0.5">
                <span className="text-base font-semibold text-foreground">{user.username}</span>
                <span className="text-xs font-normal capitalize text-muted-foreground">{user.role}</span>
              </span>
            )}
          </SheetTitle>
        </SheetHeader>
        <Separator />
        <div className="flex flex-col px-4">
          {MENU_ITEMS.map((item) => (
            <Button
              key={item.to}
              variant="ghost"
              className="justify-start px-2"
              onClick={() => {
                onOpenChange(false)
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
