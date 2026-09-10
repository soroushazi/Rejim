import { useEffect, useState } from 'react'
import { getPreferences, updatePreferences } from '@/api/preferences'
import type { WeightUnit } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function PreferencesPage() {
  const [unit, setUnit] = useState<WeightUnit>('kg')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getPreferences()
      .then((p) => setUnit(p.default_weight_unit))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await updatePreferences({ default_weight_unit: unit })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-lg font-semibold">Units & Preferences</h1>
      <Card>
        <CardHeader>
          <CardTitle>Default weight unit</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Pre-fills the unit field on every weight entry across Daily, Workout, and Goals.
          </p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="flex flex-col gap-1">
              <Label htmlFor="preferences-weight-unit">Weight unit</Label>
              <Select
                value={unit}
                onValueChange={(v) => {
                  setUnit(v as WeightUnit)
                  setSaved(false)
                }}
              >
                <SelectTrigger id="preferences-weight-unit" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="lb">lb</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" disabled={loading || saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            {saved && <span className="text-sm text-muted-foreground">Saved</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
