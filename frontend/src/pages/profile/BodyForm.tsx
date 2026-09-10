import { useState } from 'react'
import { updateProfile } from '@/api/accounts'
import type { WeightUnit } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cmFromFtIn, ftInFromCm } from '@/lib/heightUnits'

const BMI_CATEGORY_LABEL: Record<string, string> = {
  underweight: 'Underweight',
  normal: 'Normal',
  overweight: 'Overweight',
  obese: 'Obese',
}

export default function BodyForm() {
  const { user, refreshUser } = useAuth()
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ftin'>('cm')
  const [heightCm, setHeightCm] = useState(user?.height_cm ?? '')
  const [feet, setFeet] = useState(() => (user?.height_cm ? String(ftInFromCm(Number(user.height_cm)).feet) : ''))
  const [inches, setInches] = useState(() => (user?.height_cm ? String(ftInFromCm(Number(user.height_cm)).inches) : ''))
  const [age, setAge] = useState(user?.age !== null && user?.age !== undefined ? String(user.age) : '')
  const [startingWeight, setStartingWeight] = useState(user?.starting_weight ?? '')
  const [startingWeightUnit, setStartingWeightUnit] = useState<WeightUnit>(user?.starting_weight_unit ?? 'kg')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function switchUnit(next: 'cm' | 'ftin') {
    if (next === 'ftin' && heightCm) {
      const converted = ftInFromCm(Number(heightCm))
      setFeet(String(converted.feet))
      setInches(String(converted.inches))
    }
    setHeightUnit(next)
  }

  function updateFeetInches(nextFeet: string, nextInches: string) {
    setFeet(nextFeet)
    setInches(nextInches)
    if (!nextFeet && !nextInches) {
      setHeightCm('')
      return
    }
    setHeightCm(cmFromFtIn(Number(nextFeet || 0), Number(nextInches || 0)).toFixed(1))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile({
        height_cm: heightCm.trim() ? heightCm.trim() : null,
        age: age.trim() ? Number(age) : null,
        starting_weight: startingWeight.trim() ? startingWeight.trim() : null,
        starting_weight_unit: startingWeightUnit,
      })
      await refreshUser()
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Body</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label>Height</Label>
          <div className="flex items-center gap-2">
            {heightUnit === 'cm' ? (
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                placeholder="cm"
                className="w-28"
                value={heightCm}
                onChange={(e) => {
                  setHeightCm(e.target.value)
                  setSaved(false)
                }}
              />
            ) : (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  placeholder="ft"
                  className="w-16"
                  value={feet}
                  onChange={(e) => {
                    updateFeetInches(e.target.value, inches)
                    setSaved(false)
                  }}
                />
                <span className="text-sm text-muted-foreground">ft</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  placeholder="in"
                  className="w-16"
                  value={inches}
                  onChange={(e) => {
                    updateFeetInches(feet, e.target.value)
                    setSaved(false)
                  }}
                />
                <span className="text-sm text-muted-foreground">in</span>
              </div>
            )}
            <ToggleGroup
              type="single"
              value={heightUnit}
              onValueChange={(v) => v && switchUnit(v as 'cm' | 'ftin')}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="cm">cm</ToggleGroupItem>
              <ToggleGroupItem value="ftin">ft/in</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="body-age">Age</Label>
            <Input
              id="body-age"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={age}
              onChange={(e) => {
                setAge(e.target.value)
                setSaved(false)
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="body-starting-weight">Starting weight</Label>
            <div className="flex gap-1.5">
              <Input
                id="body-starting-weight"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={startingWeight}
                onChange={(e) => {
                  setStartingWeight(e.target.value)
                  setSaved(false)
                }}
              />
              <Select
                value={startingWeightUnit}
                onValueChange={(v) => {
                  setStartingWeightUnit(v as WeightUnit)
                  setSaved(false)
                }}
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
        </div>

        {user?.bmi !== null && user?.bmi !== undefined && (
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
            <span className="text-sm text-muted-foreground">BMI</span>
            <span className="font-semibold">{user.bmi}</span>
            {user.bmi_category && <Badge variant="secondary">{BMI_CATEGORY_LABEL[user.bmi_category]}</Badge>}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          {saved && <span className="text-sm text-muted-foreground">Saved</span>}
        </div>
      </CardContent>
    </Card>
  )
}
