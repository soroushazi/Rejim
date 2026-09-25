import { Info, Maximize2, X } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

/** Wraps a chart (any of the hand-rolled inline-SVG charts under pages/**)
 * with a zoom button on the far right of its own title row - the only way to
 * zoom in (tapping the figure itself used to zoom too, but that made
 * interacting with the chart's own legend/series-toggle buttons and data
 * points feel accident-prone, so it's icon-only now). Zooming opens the
 * chart in a centered modal card
 * sized to the figure's full height but not its full width (a full-bleed
 * overlay reads as clumsy on a small screen); on a phone (whose viewport is
 * portrait-shaped regardless of a physical "Portrait Orientation Lock"
 * setting - that lock keeps the OS from ever reporting landscape at all) the
 * card is rotated into landscape via `.chart-zoom-card`'s CSS (see
 * index.css), so the wide chart still gets the phone's long axis without the
 * device needing to (or being able to) physically rotate. The close button
 * lives outside that rotated card, pinned to the real screen corner, so it's
 * reachable (and upright) no matter which way the card is rotated.
 *
 * `children` can be a render function receiving `zoomed` - use that (not the
 * static-node form) whenever the chart should actually get *more readable*
 * when zoomed, not just visually bigger: bump its own `fontSize`/stroke-width
 * constants and stretch its `<svg>` to fill the taller card (`h-full` beside
 * the usual `w-full`, inside a `flex-1 min-h-0` wrapper) rather than staying
 * bound to its own fixed aspect-ratio width. The zoomed card drops the title
 * entirely (the chart's own legend/toggle labels already say what's on it),
 * so that space goes to the figure instead.
 *
 * Wrap a chart's own top-level return value with this (not its call site) so
 * the chart's internal state (series toggles, selected day, ...) belongs to
 * one component instance regardless of where its output gets portaled. */
export default function ZoomableChart({
  title,
  children,
  className,
  onInfoClick,
  infoLabel,
}: {
  title?: string
  children: ReactNode | ((zoomed: boolean) => ReactNode)
  className?: string
  /** Renders an (i) info icon in the title row, right after the title text -
   * for a chart that wants a "what am I looking at" explanation (e.g.
   * OverviewChart's weight-vs-average-weight distinction), same convention
   * as the RPE/Calories-Out info icons elsewhere in the app. Only shown in
   * the un-zoomed header, since the zoomed view already drops the title. */
  onInfoClick?: () => void
  infoLabel?: string
}) {
  const [zoomed, setZoomed] = useState(false)

  if (zoomed) {
    return createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
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
          className="chart-zoom-card flex flex-col overflow-auto rounded-xl bg-popover p-2.5 text-popover-foreground shadow-lg ring-1 ring-foreground/10"
        >
          {typeof children === 'function' ? children(true) : children}
        </div>
      </div>,
      document.body,
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        {title && <span className="font-heading text-base font-medium">{title}</span>}
        {onInfoClick && (
          <button
            type="button"
            onClick={onInfoClick}
            aria-label={infoLabel ?? 'More information'}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          >
            <Info className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="Zoom in on this chart"
          className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <Maximize2 className="size-3.5" />
        </button>
      </div>
      <div>{typeof children === 'function' ? children(false) : children}</div>
    </div>
  )
}

/** Same title styling as ZoomableChart's own header, for a chart's "no data
 * yet" early-return - so the title doesn't disappear just because there's
 * nothing to zoom into. Takes the same optional info-icon props for the same
 * reason - a chart's "what am I looking at" explanation is just as relevant
 * before any data's been logged. */
export function ChartEmptyState({
  title,
  message,
  onInfoClick,
  infoLabel,
}: {
  title?: string
  message: string
  onInfoClick?: () => void
  infoLabel?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {title && <span className="font-heading text-base font-medium">{title}</span>}
        {onInfoClick && (
          <button
            type="button"
            onClick={onInfoClick}
            aria-label={infoLabel ?? 'More information'}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          >
            <Info className="size-3.5" />
          </button>
        )}
      </div>
      <p className="py-6 text-center text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
