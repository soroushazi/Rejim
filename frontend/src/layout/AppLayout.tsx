import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import NotificationBanner from '@/components/NotificationBanner'
import Header from './Header'
import BottomNav from './BottomNav'
import NavDrawer from './NavDrawer'

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    // dvh tracks the *current* visual viewport live as Safari's toolbar shows/hides, so the
    // shell never lags behind the fixed BottomNav (which always re-anchors to the real viewport)
    // on short, otherwise-unscrollable pages (e.g. Diet, Trainer) after an in-app navigation.
    // The +1px still forces the page to be scrollable, which some mobile browsers need to ever
    // collapse their toolbar chrome in the first place.
    <div className="flex min-h-[calc(100dvh+1px)] flex-col">
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
