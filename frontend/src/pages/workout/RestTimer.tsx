import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function getAudioContextCtor(): typeof AudioContext | null {
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  )
}

/** Three short beeps rather than one - a single 300ms tone is easy to miss
 * if the phone isn't right in front of you between sets. `ctx` must already
 * be running (see handleStart's comment below) or nothing audible happens. */
function playBeeps(ctx: AudioContext) {
  for (const offset of [0, 0.35, 0.7]) {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.frequency.value = 880
    const startAt = ctx.currentTime + offset
    // A quick attack/decay envelope instead of a flat on/off, so each beep
    // doesn't pop.
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(0.3, startAt + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.25)
    oscillator.start(startAt)
    oscillator.stop(startAt + 0.3)
  }
}

/** A simple rest-timer widget: configurable duration (seeded from the plan's
 * default_rest_seconds), start/cancel, and an audible+haptic alert on
 * completion. Purely local/client-side - no backend field, per spec.
 *
 * The alert is more involved than "beep on zero" because of a real iOS
 * Safari (this app's primary target) constraint: a Web Audio `AudioContext`
 * only actually produces sound if it was created (or resumed) synchronously
 * inside a genuine user-gesture handler, like a tap. One created later -
 * e.g. inside the `setTimeout` callback that fires when the countdown
 * reaches zero - is silently muted; the code runs without error, nothing is
 * audible. So the context is created/unlocked here at "Start rest" (a real
 * tap) and kept around in a ref to reuse for the completion beep. */
export default function RestTimer({ defaultSeconds }: { defaultSeconds: number }) {
  const [duration, setDuration] = useState(defaultSeconds)
  const [remaining, setRemaining] = useState<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    setDuration(defaultSeconds)
  }, [defaultSeconds])

  function handleStart() {
    try {
      const Ctor = getAudioContextCtor()
      if (Ctor) {
        const ctx = audioCtxRef.current ?? new Ctor()
        if (ctx.state === 'suspended') ctx.resume().catch(() => {})
        audioCtxRef.current = ctx
      }
    } catch {
      // Web Audio unavailable - the countdown still reaches zero visually.
    }
    setRemaining(duration)
  }

  useEffect(() => {
    if (remaining === null) return
    if (remaining <= 0) {
      if (audioCtxRef.current) playBeeps(audioCtxRef.current)
      // Android only (no-op on iOS Safari, which has no Vibration API) -
      // an extra cue that doesn't depend on the phone's volume/silent switch.
      navigator.vibrate?.([200, 100, 200, 100, 200])
      setRemaining(null)
      return
    }
    const id = window.setTimeout(() => setRemaining((r) => (r !== null ? r - 1 : null)), 1000)
    return () => window.clearTimeout(id)
  }, [remaining])

  // One AudioContext reused across every "Start rest" tap for this row
  // (browsers cap how many can be alive at once) - only actually closed
  // when the row itself unmounts.
  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {})
    }
  }, [])

  return (
    <div className="flex w-full items-center gap-2">
      {remaining === null ? (
        <>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            step="5"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="h-7 w-16 shrink-0"
          />
          <span className="shrink-0 text-xs text-muted-foreground">sec rest</span>
          <Button type="button" size="sm" variant="outline" className="flex-1" onClick={handleStart}>
            Start rest
          </Button>
        </>
      ) : (
        <>
          <span className="shrink-0 text-sm font-medium tabular-nums">{remaining}s</span>
          <Button type="button" size="sm" variant="ghost" className="flex-1" onClick={() => setRemaining(null)}>
            Cancel
          </Button>
        </>
      )}
    </div>
  )
}
