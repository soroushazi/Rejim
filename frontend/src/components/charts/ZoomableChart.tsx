import { Maximize2, X } from 'lucide-react'
import { type MouseEvent, type ReactNode, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

/** Wraps a chart (any of the hand-rolled inline-SVG charts under pages/**)
 * with a zoom button right in front of its own title, plus tap-to-zoom on the
 * figure itself. Zooming opens the same chart full-screen; on a phone held in
 * portrait (the common case for this PWA) the chart itself is rotated into
 * landscape via `.chart-zoom-overlay`'s CSS (see index.css) so the wide chart
 * gets the phone's long axis without physically rotating it - the close
 * button stays outside that rotated box, pinned to the real screen corner, so
 * it's reachable (and upright) no matter which way the content is rotated.
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
      <div className="fixed inset-0 z-50 bg-background">
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
        <div className="chart-zoom-overlay flex flex-col justify-center gap-3 overflow-auto p-4">
          {title && <span className="font-heading text-base font-medium">{title}</span>}
          {children}
        </div>
      </div>,
      document.body,
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="Zoom in on this chart"
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <Maximize2 className="size-3.5" />
        </button>
        {title && <span className="font-heading text-base font-medium">{title}</span>}
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
