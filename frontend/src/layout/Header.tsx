import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type HeaderProps = {
  menuOpen: boolean
  onToggleMenu: () => void
}

export default function Header({ menuOpen, onToggleMenu }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card px-4"
      style={{ height: 'var(--header-height)', paddingTop: 'env(safe-area-inset-top)' }}
    >
      <span className="text-xl font-bold tracking-tight text-primary">Rejim</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        onClick={onToggleMenu}
      >
        {menuOpen ? <X /> : <Menu />}
      </Button>
    </header>
  )
}
