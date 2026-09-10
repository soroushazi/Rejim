import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateProfile } from '@/api/accounts'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import BodyForm from '@/pages/profile/BodyForm'
import GoalsOnboardingCard from '@/pages/profile/GoalsOnboardingCard'
import PreferencesForm from '@/pages/profile/PreferencesForm'
import TrainerConnectionStep from './TrainerConnectionStep'

const STEPS = [
  { label: 'Baseline', Component: BodyForm },
  { label: 'Goals', Component: GoalsOnboardingCard },
  { label: 'Preferences', Component: PreferencesForm },
  { label: 'Trainer Connection', Component: TrainerConnectionStep },
] as const

/** The signup-time onboarding flow (see LOGIN_ONBOARDING_SPEC.md) - distinct
 * from /profile, which is the ongoing edit-anytime surface for the same
 * data. Each step below reuses the exact same Profile components (they
 * already persist via their own Save/Add actions against the same API) -
 * "Next" here only sequences steps, it doesn't re-save anything itself. */
export default function OnboardingWizard() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [step, setStep] = useState(0)
  const [finishing, setFinishing] = useState(false)

  const { Component } = STEPS[step]
  const isLast = step === STEPS.length - 1

  async function complete() {
    setFinishing(true)
    try {
      await updateProfile({ onboarding_completed: true })
      await refreshUser()
      navigate('/diet')
    } finally {
      setFinishing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Welcome! Let's set you up</h1>
        <Button type="button" variant="ghost" size="sm" disabled={finishing} onClick={complete}>
          Skip for now
        </Button>
      </div>

      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={cn(
                'h-1.5 w-full rounded-full',
                i <= step ? 'bg-primary' : 'bg-muted',
              )}
            />
            <span className={cn('text-center text-[10px] leading-tight', i === step ? 'font-medium text-foreground' : 'text-muted-foreground')}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <Component />

      <p className="text-xs text-muted-foreground">Save your changes above, then continue.</p>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          Back
        </Button>
        {isLast ? (
          <Button type="button" size="sm" disabled={finishing} onClick={complete}>
            {finishing ? 'Finishing…' : 'Finish'}
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={() => setStep((s) => s + 1)}>
            Next
          </Button>
        )}
      </div>
    </div>
  )
}
