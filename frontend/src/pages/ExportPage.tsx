import { useState } from 'react'
import { downloadExport, type ExportKind } from '@/api/export'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Toggle } from '@/components/ui/toggle'
import { toDateKey } from '@/lib/date'
import DateRangeControl, { resolvePreset, type RangePreset } from '@/pages/progress/DateRangeControl'

const KINDS: { kind: ExportKind; label: string }[] = [
  { kind: 'diet-log', label: 'Diet log' },
  { kind: 'workout-log', label: 'Workout log' },
  { kind: 'daily-metrics', label: 'Daily metrics & activity' },
]

export default function ExportPage() {
  const [preset, setPreset] = useState<RangePreset>('month')
  const [customStart, setCustomStart] = useState(() => resolvePreset('7d', '', '').start)
  const [customEnd, setCustomEnd] = useState(() => toDateKey(new Date()))
  const [selected, setSelected] = useState<Set<ExportKind>>(new Set(['diet-log']))
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const range = resolvePreset(preset, customStart, customEnd)
  const rangeInvalid = preset === 'custom' && customStart > customEnd

  function toggleKind(kind: ExportKind, pressed: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (pressed) next.add(kind)
      else next.delete(kind)
      return next
    })
  }

  async function handleExport() {
    setExporting(true)
    setError(null)
    try {
      for (const kind of selected) {
        await downloadExport(kind, range.start, range.end)
      }
    } catch {
      setError('Could not export - please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-lg font-semibold">Data Export</h1>
      <DateRangeControl
        preset={preset}
        onPresetChange={setPreset}
        customStart={customStart}
        customEnd={customEnd}
        onCustomChange={(s, e) => {
          setCustomStart(s)
          setCustomEnd(e)
        }}
      />
      <Card>
        <CardHeader>
          <CardTitle>What to export</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map(({ kind, label }) => (
              <Toggle
                key={kind}
                pressed={selected.has(kind)}
                onPressedChange={(v) => toggleKind(kind, v)}
                variant="outline"
                size="sm"
              >
                {label}
              </Toggle>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="button"
            size="sm"
            className="w-fit"
            disabled={exporting || selected.size === 0 || rangeInvalid}
            onClick={handleExport}
          >
            {exporting ? 'Exporting…' : 'Export my data'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
