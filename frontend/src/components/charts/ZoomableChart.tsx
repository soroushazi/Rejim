import { Maximize2, X } from 'lucide-react'
import { type MouseEvent, type ReactNode, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

/** Wraps a chart (any of the hand-rolled inline-SVG charts under pages/**)
 * with a zoom button on the far right of its own title row, plus tap-to-zoom
 * on the figure itself. Zooming opens the chart in a centered modal card (not
 * edge-to-edge - a full-bleed overlay reads as clumsy on a small screen); on
 * a phone (whose viewport is portrait-shaped regardless of a physical
 * "Portrait Orientation Lock" setting - that lock keeps the OS from ever
 * reporting landscape at all) the card is rotated into landscape via
 * `.chart-zoom-card`'s CSS (see index.css), so the wide chart still gets the
 * phone's long axis without the device needing to (or being able to)
 * physically rotate. The close button lives outside that rotated card,
 * pinned to the real screen corner, so it's reachable (and upright) no
 * matter which way the card is rotated.
 * Wrap a chart's own top-level return value with this (not its call site) so
 * the chart's internal state (series toggles, selected day, ...) belongs to
 * one component instance regardless of where its output gets portaled. */
export default function ZoomableChart({
  title,
  children,
  className,
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  const [zoomed, setZoomed] = useState(false)

  function handleFigureClick(e: MouseEvent<HTMLDivElement>) {
    // Legend/series-toggle buttons live inside `children` too - let their own
    // onClick do its thing without also blowing the chart up to full-screen.
    if ((e.target as HTMLElement).closest('button')) return
    setZoomed(true)
  }

  if (zoomed) {
    return createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
        onClick={() => setZoomed(false)}
      >
        <button
          type="button"
          onClick={() => setZoomed(false)}
          aria-label="Close zoomed chart"
          style={{
            top: 'max(0.75rem, env(safe-area-inset-top))',
            right: 'max(0.75rem, env(safe-area-inset-right))',
          }}
          className="fixed z-[60] flex size-9 items-center justify-center rounded-full bg-muted text-foreground shadow-sm hover:bg-muted/80"
        >
          <X className="size-4" />
        </button>
        <div
          onClick={(e) => e.stopPropagation()}
          className="chart-zoom-card flex flex-col justify-center gap-3 overflow-auto rounded-xl bg-popover p-4 text-popover-foreground shadow-lg ring-1 ring-foreground/10"
        >
          {title && <span className="font-heading text-base font-medium">{title}</span>}
          {children}
        </div>
      </div>,
      document.body,
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        {title && <span className="font-heading text-base font-medium">{title}</span>}
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="Zoom in on this chart"
          className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <Maximize2 className="size-3.5" />
        </button>
      </div>
      <div onClick={handleFigureClick} className="cursor-zoom-in">
        {children}
      </div>
    </div>
  )
}

/** Same title styling as ZoomableChart's own header, for a chart's "no data
 * yet" early-return - so the title doesn't disappear just because there's
 * nothing to zoom into. */
export function ChartEmptyState({ title, message }: { title?: string; message: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {title && <span className="font-heading text-base font-medium">{title}</span>}
      <p className="py-6 text-center text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
