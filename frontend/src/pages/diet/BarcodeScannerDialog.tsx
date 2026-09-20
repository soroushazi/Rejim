import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { BrowserMultiFormatReader } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'
import { getFoodItemByBarcode } from '@/api/foodItems'
import type { FoodItem } from '@/api/types'
import { normalizeBarcode } from '@/lib/barcode'
import { Button } from '@/components/ui/button'

type Status = 'scanning' | 'looking-up' | 'not-found' | 'error'

/** Full-screen camera overlay for scanning a product barcode, portaled to document.body -
 * same convention as ZoomableChart's zoomed view (fixed overlay, close button pinned to
 * the real screen corner respecting the safe-area insets), since a live camera feed
 * doesn't fit a centered modal card well. Uses @zxing/browser rather than the native
 * BarcodeDetector API - Safari/iOS (this app's primary target, an installed home-screen
 * PWA) doesn't support BarcodeDetector at all. */
export default function BarcodeScannerDialog({
  open,
  onOpenChange,
  onFound,
  onNotFound,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFound: (item: FoodItem) => void
  onNotFound: (barcode: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [status, setStatus] = useState<Status>('scanning')
  const [message, setMessage] = useState('')
  const [notFoundBarcode, setNotFoundBarcode] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!open) return
    setStatus('scanning')
    setMessage('')

    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
    ])
    const reader = new BrowserMultiFormatReader(hints)
    let cancelled = false
    let handled = false

    async function lookUp(rawText: string) {
      const normalized = normalizeBarcode(rawText)
      if (!normalized) {
        setStatus('error')
        setMessage("That doesn't look like a product barcode.")
        return
      }
      setStatus('looking-up')
      try {
        const item = await getFoodItemByBarcode(normalized)
        if (cancelled) return
        if (item) {
          onFound(item)
          onOpenChange(false)
        } else {
          setNotFoundBarcode(normalized)
          setStatus('not-found')
        }
      } catch {
        if (!cancelled) {
          setStatus('error')
          setMessage("Couldn't look that up - check your connection and try again.")
        }
      }
    }

    reader
      .decodeFromConstraints({ video: { facingMode: 'environment' } }, videoRef.current ?? undefined, (result, _err, controls) => {
        controlsRef.current = controls
        if (cancelled || handled || !result) return
        handled = true
        controls.stop()
        lookUp(result.getText())
      })
      .catch((err) => {
        if (cancelled) return
        setStatus('error')
        setMessage(
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Camera access was denied. Check your browser/app permissions and try again.'
            : "Couldn't access the camera on this device.",
        )
      })

    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
    }
    // NotFoundException fires continuously from the callback above while no barcode is
    // in view - that's expected per-frame noise, not a real error, so it's never surfaced.
  }, [open, attempt, onFound, onNotFound, onOpenChange])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        aria-label="Close barcode scanner"
        style={{
          top: 'max(0.75rem, env(safe-area-inset-top))',
          right: 'max(0.75rem, env(safe-area-inset-right))',
        }}
        className="fixed z-[60] flex size-9 items-center justify-center rounded-full bg-muted text-foreground shadow-sm hover:bg-muted/80"
      >
        <X className="size-4" />
      </button>

      {status === 'scanning' && (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="aspect-video w-4/5 max-w-sm rounded-2xl border-4 border-white/70" />
            <p className="rounded-full bg-black/50 px-4 py-1.5 text-sm text-white">Point your camera at a barcode</p>
          </div>
        </>
      )}

      {status === 'looking-up' && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-white">Looking it up…</p>
        </div>
      )}

      {(status === 'not-found' || status === 'error') && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm text-white">
            {status === 'not-found' ? "No food matches this barcode yet." : message}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
              Scan again
            </Button>
            {status === 'not-found' && (
              <Button
                type="button"
                onClick={() => {
                  onNotFound(notFoundBarcode)
                  onOpenChange(false)
                }}
              >
                Add to Food Bank
              </Button>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
