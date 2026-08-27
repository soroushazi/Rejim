import { useAuth } from '../auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

type NavDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function NavDrawer({ open, onOpenChange }: NavDrawerProps) {
  const { user, logout } = useAuth()

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
          <Button variant="ghost" className="justify-start px-2" disabled>
            Profile
          </Button>
          <Button variant="ghost" className="justify-start px-2" disabled>
            Settings
          </Button>
          <Separator className="my-1" />
          <Button variant="ghost" className="justify-start px-2 text-destructive" onClick={logout}>
            Log out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
