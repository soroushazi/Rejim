import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import NotificationBanner from '@/components/NotificationBanner'
import Header from './Header'
import BottomNav from './BottomNav'
import NavDrawer from './NavDrawer'

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    // +1px forces the page to always be scrollable, so iOS Safari never gets stuck with a
    // stale viewport for the fixed BottomNav on short, otherwise-unscrollable pages (e.g. Diet, Trainer).
    <div className="flex min-h-[calc(100svh+1px)] flex-col">
      <Header menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((open) => !open)} />
      <NotificationBanner />
      <main
        className="flex-1 px-4 pt-4"
        style={{ paddingBottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom) + 16px)' }}
      >
        <Outlet />
      </main>
      <BottomNav />
      <NavDrawer open={menuOpen} onOpenChange={setMenuOpen} />
    </div>
  )
}
