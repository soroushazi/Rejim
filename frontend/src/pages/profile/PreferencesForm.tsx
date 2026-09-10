import { useEffect, useState } from 'react'
import { updateProfile } from '@/api/accounts'
import { listDietaryTags } from '@/api/foodItems'
import type { DietaryTag, ExperienceLevel, GymLocation } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import MultiSelectDropdown from '@/components/MultiSelectDropdown'

const GYM_LOCATION_OPTIONS: { value: GymLocation; label: string }[] = [
  { value: 'home', label: 'Home gym' },
  { value: 'commercial', label: 'Commercial gym' },
  { value: 'outdoor', label: 'Outdoor / park' },
  { value: 'none', label: 'No gym (bodyweight only)' },
]

const EXPERIENCE_LEVEL_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

/** Captures meal/workout preferences for future Diet/Workout plan-authoring
 * UI to consume - not surfaced to trainers yet, since that authoring UI
 * doesn't exist in this app yet (see CLAUDE.md's Build Order). */
export default function PreferencesForm() {
  const { user, refreshUser } = useAuth()
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>([])
  const [mealPreferences, setMealPreferences] = useState<string[]>(user?.meal_preferences.map(String) ?? [])
  const [mealNotes, setMealNotes] = useState(user?.meal_preferences_notes ?? '')
  const [daysPerWeek, setDaysPerWeek] = useState(
    user?.workout_days_per_week !== null && user?.workout_days_per_week !== undefined
      ? String(user.workout_days_per_week)
      : '',
  )
  const [sessionMinutes, setSessionMinutes] = useState(
    user?.workout_session_minutes !== null && user?.workout_session_minutes !== undefined
      ? String(user.workout_session_minutes)
      : '',
  )
  const [gymLocation, setGymLocation] = useState<GymLocation | ''>(user?.gym_location ?? '')
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | ''>(user?.experience_level ?? '')
  const [injuryNotes, setInjuryNotes] = useState(user?.injury_notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    listDietaryTags()
      .then(setDietaryTags)
      .catch(() => setDietaryTags([]))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile({
        meal_preferences: mealPreferences.map(Number),
        meal_preferences_notes: mealNotes,
        workout_days_per_week: daysPerWeek.trim() ? Number(daysPerWeek) : null,
        workout_session_minutes: sessionMinutes.trim() ? Number(sessionMinutes) : null,
        gym_location: gymLocation || null,
        experience_level: experienceLevel || null,
        injury_notes: injuryNotes,
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
        <CardTitle>Preferences</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Meal preferences</Label>
          <MultiSelectDropdown
            label="Dietary tags"
            options={dietaryTags}
            selected={mealPreferences}
            onChange={(next) => {
              setMealPreferences(next)
              setSaved(false)
            }}
            searchable
          />
          <Textarea
            placeholder="Anything else your trainer should know (allergies, dislikes, etc.)"
            value={mealNotes}
            onChange={(e) => {
              setMealNotes(e.target.value)
              setSaved(false)
            }}
          />
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <Label>Workout preferences</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="profile-days-per-week" className="text-xs font-normal text-muted-foreground">
                Times per week
              </Label>
              <Input
                id="profile-days-per-week"
                type="number"
                inputMode="numeric"
                min="1"
                max="7"
                step="1"
                value={daysPerWeek}
                onChange={(e) => {
                  setDaysPerWeek(e.target.value)
                  setSaved(false)
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="profile-session-minutes" className="text-xs font-normal text-muted-foreground">
                Session duration (min)
              </Label>
              <Input
                id="profile-session-minutes"
                type="number"
                inputMode="numeric"
                min="0"
                step="5"
                value={sessionMinutes}
                onChange={(e) => {
                  setSessionMinutes(e.target.value)
                  setSaved(false)
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="profile-gym-location" className="text-xs font-normal text-muted-foreground">
                Where do you train?
              </Label>
              <Select
                value={gymLocation}
                onValueChange={(v) => {
                  setGymLocation(v as GymLocation)
                  setSaved(false)
                }}
              >
                <SelectTrigger id="profile-gym-location" className="w-full">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {GYM_LOCATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="profile-experience-level" className="text-xs font-normal text-muted-foreground">
                Lifting experience
              </Label>
              <Select
                value={experienceLevel}
                onValueChange={(v) => {
                  setExperienceLevel(v as ExperienceLevel)
                  setSaved(false)
                }}
              >
                <SelectTrigger id="profile-experience-level" className="w-full">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="profile-injury-notes" className="text-xs font-normal text-muted-foreground">
              Injuries / limitations
            </Label>
            <Textarea
              id="profile-injury-notes"
              placeholder="e.g. bad left knee, avoid deep squats"
              value={injuryNotes}
              onChange={(e) => {
                setInjuryNotes(e.target.value)
                setSaved(false)
              }}
            />
          </div>
        </div>
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
