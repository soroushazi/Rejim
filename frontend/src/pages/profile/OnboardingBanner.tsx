import { X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateProfile } from '@/api/accounts'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'

/** One-time nudge for a first-time trainee who skipped or navigated away
 * from the /onboarding wizard - resumable (Continue setup) or dismissible
 * (X = skip entirely, same as the wizard's own "Skip for now"). */
export default function OnboardingBanner() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [dismissing, setDismissing] = useState(false)
  const [hidden, setHidden] = useState(false)

  if (!user || user.onboarding_completed || hidden) return null

  async function handleDismiss() {
    setDismissing(true)
    setHidden(true)
    try {
      await updateProfile({ onboarding_completed: true })
      await refreshUser()
    } catch {
      setHidden(false)
    } finally {
      setDismissing(false)
    }
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
      <div className="flex-1">
        <p className="font-medium">Finish setting up your profile</p>
        <p className="mb-1.5 text-muted-foreground">
          Add your height, weight, and goals so the app can track your progress against real data.
        </p>
        <Button type="button" size="sm" onClick={() => navigate('/onboarding')}>
          Continue setup
        </Button>
      </div>
      <button type="button" onClick={handleDismiss} disabled={dismissing} aria-label="Dismiss">
        <X className="size-4 text-muted-foreground" />
      </button>
    </div>
  )
}
