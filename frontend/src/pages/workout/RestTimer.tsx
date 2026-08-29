import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function beep() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioContextClass()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.3)
    oscillator.onended = () => ctx.close()
  } catch {
    // Web Audio unavailable - fail silently, the countdown still reaches zero visually.
  }
}

/** A simple rest-timer widget: configurable duration (seeded from the plan's
 * default_rest_seconds), start/cancel, and a short beep on completion. Purely
 * local/client-side - no backend field, per spec. */
export default function RestTimer({ defaultSeconds }: { defaultSeconds: number }) {
  const [duration, setDuration] = useState(defaultSeconds)
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    setDuration(defaultSeconds)
  }, [defaultSeconds])

  useEffect(() => {
    if (remaining === null) return
    if (remaining <= 0) {
      beep()
      setRemaining(null)
      return
    }
    const id = window.setTimeout(() => setRemaining((r) => (r !== null ? r - 1 : null)), 1000)
    return () => window.clearTimeout(id)
  }, [remaining])

  return (
    <div className="flex items-center gap-2">
      {remaining === null ? (
        <>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            step="5"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="h-7 w-16"
          />
          <span className="text-xs text-muted-foreground">sec rest</span>
          <Button type="button" size="sm" variant="outline" onClick={() => setRemaining(duration)}>
            Start rest
          </Button>
        </>
      ) : (
        <>
          <span className="text-sm font-medium tabular-nums">{remaining}s</span>
          <Button type="button" size="sm" variant="ghost" onClick={() => setRemaining(null)}>
            Cancel
          </Button>
        </>
      )}
    </div>
  )
}
