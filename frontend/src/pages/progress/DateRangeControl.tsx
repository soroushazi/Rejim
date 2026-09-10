import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { addDays, toDateKey } from '@/lib/date'

export type RangePreset = '7d' | 'month' | '3mo' | 'all' | 'custom'

const PRESET_LABEL: Record<RangePreset, string> = {
  '7d': 'Last 7 days',
  month: 'Last month',
  '3mo': 'Last 3 months',
  all: 'All time',
  custom: 'Custom',
}

const PRESETS: RangePreset[] = ['7d', 'month', '3mo', 'all', 'custom']

// "All time" has no real lower bound to query from without an extra fetch, and
// the overview endpoint dense-fills every day in range - a 2-year lookback is
// a generous, practically-unbounded window at this app's ~10-user Stage 1
// scale, without risking an enormous per-day array.
const ALL_TIME_DAYS = 730

export function resolvePreset(preset: RangePreset, customStart: string, customEnd: string) {
  const today = toDateKey(new Date())
  if (preset === 'custom') return { start: customStart, end: customEnd }
  if (preset === '7d') return { start: addDays(today, -6), end: today }
  if (preset === 'month') return { start: addDays(today, -29), end: today }
  if (preset === '3mo') return { start: addDays(today, -89), end: today }
  return { start: addDays(today, -(ALL_TIME_DAYS - 1)), end: today }
}

type Props = {
  preset: RangePreset
  onPresetChange: (preset: RangePreset) => void
  customStart: string
  customEnd: string
  onCustomChange: (start: string, end: string) => void
}

export default function DateRangeControl({ preset, onPresetChange, customStart, customEnd, onCustomChange }: Props) {
  const today = toDateKey(new Date())
  const rangeInvalid = preset === 'custom' && customStart > customEnd

  return (
    <div className="flex flex-col gap-2">
      <Select value={preset} onValueChange={(v) => onPresetChange(v as RangePreset)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p} value={p}>
              {PRESET_LABEL[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === 'custom' && (
        <div className="flex items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor="progress-range-start">From</Label>
            <Input
              id="progress-range-start"
              type="date"
              value={customStart}
              max={customEnd}
              onChange={(e) => onCustomChange(e.target.value, customEnd)}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor="progress-range-end">To</Label>
            <Input
              id="progress-range-end"
              type="date"
              value={customEnd}
              min={customStart}
              max={today}
              onChange={(e) => onCustomChange(customStart, e.target.value)}
            />
          </div>
        </div>
      )}
      {rangeInvalid && <p className="text-sm text-destructive">The start date must be before the end date.</p>}
    </div>
  )
}
