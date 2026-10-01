import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A bordered, collapsed-by-default card for an optional part of a form (e.g.
 * micronutrients, an ingredients calculator) - keeps rarely-used fields from
 * taking over the page while staying one tap away. `summary` shows next to the
 * title (e.g. "3 filled") so values entered or computed while it's closed
 * aren't invisible. */
export default function CollapsibleFormSection({
  title,
  summary,
  open,
  onOpenChange,
  children,
}: {
  title: string
  summary?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
      >
        <span>
          {title}
          {summary && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{summary}</span>}
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="flex flex-col gap-3 border-t border-border p-3">{children}</div>}
    </div>
  )
}
