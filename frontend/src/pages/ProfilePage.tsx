import { useState } from 'react'
import { changePassword, updateProfile } from '@/api/accounts'
import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import BodyForm from './profile/BodyForm'
import GoalsOnboardingCard from './profile/GoalsOnboardingCard'
import OnboardingBanner from './profile/OnboardingBanner'
import PreferencesForm from './profile/PreferencesForm'
import TrainerConnectionCard from './profile/TrainerConnectionCard'

function NameForm() {
  const { user, refreshUser } = useAuth()
  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName, setLastName] = useState(user?.last_name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await updateProfile({ first_name: firstName, last_name: lastName })
      await refreshUser()
      setSaved(true)
    } catch {
      setError('Could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Name</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="profile-first-name">First name</Label>
            <Input
              id="profile-first-name"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value)
                setSaved(false)
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="profile-last-name">Last name</Label>
            <Input
              id="profile-last-name"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value)
                setSaved(false)
              }}
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
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

function PasswordForm() {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await changePassword(oldPassword, newPassword)
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSaved(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const body = err.body as Record<string, string[]> | undefined
        setError(body?.old_password?.[0] ?? body?.new_password?.[0] ?? 'Could not change password.')
      } else {
        setError('Could not change password.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="profile-old-password">Current password</Label>
          <Input
            id="profile-old-password"
            type="password"
            value={oldPassword}
            onChange={(e) => {
              setOldPassword(e.target.value)
              setSaved(false)
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="profile-new-password">New password</Label>
          <Input
            id="profile-new-password"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value)
              setSaved(false)
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="profile-confirm-password">Confirm new password</Label>
          <Input
            id="profile-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              setSaved(false)
            }}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={saving || !oldPassword || !newPassword}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : 'Change password'}
          </Button>
          {saved && <span className="text-sm text-muted-foreground">Password changed</span>}
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProfilePage() {
  const { viewMode } = useAuth()
  // Keyed off the current view mode, not the raw is_trainee flag - a
  // dual-role account currently acting as trainer shouldn't see their own
  // trainee onboarding sections here either (see NavDrawer.tsx/BottomNav.tsx
  // for the same viewMode-driven trim).
  const isTrainee = viewMode === 'trainee'

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-lg font-semibold">Profile</h1>
      {isTrainee && <OnboardingBanner />}
      <NameForm />
      {isTrainee && (
        <>
          <BodyForm />
          <GoalsOnboardingCard />
          <PreferencesForm />
          <TrainerConnectionCard />
        </>
      )}
      <PasswordForm />
    </div>
  )
}
