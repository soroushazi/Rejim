import { useEffect, useState } from 'react'
import { ApiError } from '@/api/client'
import { listDailyMetrics, saveDailyMetric } from '@/api/dailyMetrics'
import type { DailyMetric, WeightUnit } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RATING_OPTIONS } from '@/lib/ratings'
import { usePreferredWeightUnit } from '@/lib/usePreferredWeightUnit'

type Props = {
  date: string
  canLog: boolean
}

type FormState = {
  weight: string
  weight_unit: WeightUnit
  steps: string
  active_energy_kcal: string
  sleep_hours: string
  bedtime: string
  sleep_quality: string
  readiness: string
  water_intake_ml: string
  notes: string
}

const EMPTY: FormState = {
  weight: '',
  weight_unit: 'kg',
  steps: '',
  active_energy_kcal: '',
  sleep_hours: '',
  bedtime: '',
  sleep_quality: '',
  readiness: '',
  water_intake_ml: '',
  notes: '',
}

function toFormState(metric: DailyMetric | null, preferredUnit: WeightUnit): FormState {
  if (!metric) return { ...EMPTY, weight_unit: preferredUnit }
  return {
    weight: metric.weight ?? '',
    weight_unit: metric.weight_unit,
    steps: metric.steps !== null ? String(metric.steps) : '',
    active_energy_kcal: metric.active_energy_kcal !== null ? String(metric.active_energy_kcal) : '',
    sleep_hours: metric.sleep_hours ?? '',
    // <input type="time">'s own value format is "HH:MM" - drop a stored ":SS"
    // (DRF's default TimeField serialization) rather than showing it.
    bedtime: metric.bedtime ? metric.bedtime.slice(0, 5) : '',
    sleep_quality: metric.sleep_quality !== null ? String(metric.sleep_quality) : '',
    readiness: metric.readiness !== null ? String(metric.readiness) : '',
    water_intake_ml: metric.water_intake_ml !== null ? String(metric.water_intake_ml) : '',
    notes: metric.notes,
  }
}

/** A friendly-labeled 1-5 rating dropdown that can also be cleared back to unset via a "—" entry. */
function RatingSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <Select value={value || 'none'} onValueChange={(v) => onChange(v === 'none' ? '' : v)} disabled={disabled}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">—</SelectItem>
        {RATING_OPTIONS.map(({ value: n, label }) => (
          <SelectItem key={n} value={String(n)}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default function DailyMetricForm({ date, canLog }: Props) {
  // Always the current user's own preference here - the Daily Tracker tab
  // only ever logs your own metrics (canLog gates on is_trainee, never a
  // viewed trainee), so no trainee arg needed - see usePreferredWeightUnit.
  const preferredUnit = usePreferredWeightUnit()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSaved(false)
    setError(null)
    listDailyMetrics(date)
      .then((rows) => {
        if (!cancelled) setForm(toFormState(rows[0] ?? null, preferredUnit))
      })
      .catch(() => {
        if (!cancelled) setForm({ ...EMPTY, weight_unit: preferredUnit })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // preferredUnit resolves asynchronously (starts at 'kg' until the
    // preferences fetch lands) - re-running once it settles is what makes a
    // brand-new day's weight field default to the right unit instead of
    // always 'kg'.
  }, [date, preferredUnit])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await saveDailyMetric({
        date,
        weight: form.weight.trim() ? form.weight.trim() : null,
        weight_unit: form.weight_unit,
        steps: form.steps.trim() ? Number(form.steps) : null,
        active_energy_kcal: form.active_energy_kcal.trim() ? Number(form.active_energy_kcal) : null,
        sleep_hours: form.sleep_hours.trim() ? form.sleep_hours.trim() : null,
        bedtime: form.bedtime || null,
        sleep_quality: form.sleep_quality ? Number(form.sleep_quality) : null,
        readiness: form.readiness ? Number(form.readiness) : null,
        water_intake_ml: form.water_intake_ml.trim() ? Number(form.water_intake_ml) : null,
        notes: form.notes,
      })
      setSaved(true)
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 403
          ? 'Only the trainee can log their own metrics.'
          : 'Could not save.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="daily-sleep-hours">Sleep (hours)</Label>
          <Input
            id="daily-sleep-hours"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            disabled={!canLog}
            value={form.sleep_hours}
            onChange={(e) => update('sleep_hours', e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="daily-bedtime">Bedtime</Label>
          <Input
            id="daily-bedtime"
            type="time"
            disabled={!canLog}
            value={form.bedtime}
            onChange={(e) => update('bedtime', e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="daily-sleep-quality">Sleep quality</Label>
          <RatingSelect
            id="daily-sleep-quality"
            value={form.sleep_quality}
            onChange={(v) => update('sleep_quality', v)}
            disabled={!canLog}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="daily-steps">Steps</Label>
          <Input
            id="daily-steps"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            disabled={!canLog}
            value={form.steps}
            onChange={(e) => update('steps', e.target.value)}
          />
        </div>
        <div id="daily-active-energy-field" className="flex flex-col gap-1">
          <Label htmlFor="daily-active-energy">Active energy (kcal)</Label>
          <Input
            id="daily-active-energy"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            placeholder="from your watch"
            disabled={!canLog}
            value={form.active_energy_kcal}
            onChange={(e) => update('active_energy_kcal', e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="daily-readiness">Morning readiness</Label>
          <RatingSelect
            id="daily-readiness"
            value={form.readiness}
            onChange={(v) => update('readiness', v)}
            disabled={!canLog}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="daily-weight">Weight</Label>
          <div className="flex gap-1.5">
            <Input
              id="daily-weight"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              disabled={!canLog}
              value={form.weight}
              onChange={(e) => update('weight', e.target.value)}
            />
            <Select
              value={form.weight_unit}
              onValueChange={(v) => update('weight_unit', v as WeightUnit)}
              disabled={!canLog}
            >
              <SelectTrigger className="w-16 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="lb">lb</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="daily-water">Water (ml)</Label>
          <Input
            id="daily-water"
            type="number"
            inputMode="numeric"
            min="0"
            step="50"
            disabled={!canLog}
            value={form.water_intake_ml}
            onChange={(e) => update('water_intake_ml', e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="daily-notes">Notes</Label>
        <Textarea
          id="daily-notes"
          placeholder="traveled, felt off, sick…"
          disabled={!canLog}
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {canLog && (
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          {saved && <span className="text-sm text-muted-foreground">Saved</span>}
        </div>
      )}
    </div>
  )
}
