import { useEffect, useState } from 'react'
import { getTrainerConnection, submitTrainerConnection } from '@/api/trainerConnection'
import type { TrainerConnectionOption } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const OPTIONS: { value: TrainerConnectionOption; label: string; description: string; disabled?: boolean }[] = [
  {
    value: 'no_preference',
    label: 'No preference',
    description: 'Connect me to one of your expert trainers.',
  },
  {
    value: 'specific_trainer',
    label: 'I want this specific trainer',
    description: "Enter their name below - we'll connect you manually.",
  },
  {
    value: 'train_myself',
    label: 'Train myself',
    description: 'Log workouts and meals on your own, no trainer.',
    disabled: true,
  },
]

/** The only genuinely new onboarding step - a first-time trainer-assignment
 * request (see connection.models.TrainerConnection). Assignment itself is a
 * manual admin action for Stage 1, so this just records the trainee's choice. */
export default function TrainerConnectionStep() {
  const [option, setOption] = useState<TrainerConnectionOption | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getTrainerConnection().then((existing) => {
      if (existing) {
        setOption(existing.option_selected)
        setName(existing.requested_trainer_name)
      }
    })
  }, [])

  async function handleSubmit() {
    if (!option) return
    setSaving(true)
    setError(null)
    try {
      await submitTrainerConnection({
        option_selected: option,
        requested_trainer_name: option === 'specific_trainer' ? name.trim() : undefined,
      })
      setSaved(true)
    } catch {
      setError('Could not save your choice. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">Trainer Connection</h2>
        <p className="text-sm text-muted-foreground">How would you like to get started?</p>
      </div>

      <div className="flex flex-col gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={opt.disabled}
            onClick={() => {
              setOption(opt.value)
              setSaved(false)
            }}
            className={cn(
              'flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
              opt.disabled && 'cursor-not-allowed opacity-50',
              !opt.disabled && option === opt.value && 'border-primary bg-primary/5',
              !opt.disabled && option !== opt.value && 'border-border hover:bg-muted/50',
            )}
          >
            <span className="flex items-center gap-2 font-medium">
              {opt.label}
              {opt.disabled && <Badge variant="outline">Coming soon</Badge>}
            </span>
            <span className="text-sm text-muted-foreground">{opt.description}</span>
          </button>
        ))}
      </div>

      {option === 'specific_trainer' && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="trainer-connection-name">Trainer's full name</Label>
          <Input
            id="trainer-connection-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setSaved(false)
            }}
            placeholder="e.g. Jane Coach"
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={saving || !option || (option === 'specific_trainer' && !name.trim())}
          onClick={handleSubmit}
        >
          {saving ? 'Saving…' : 'Save choice'}
        </Button>
        {saved && <span className="text-sm text-muted-foreground">Saved</span>}
      </div>
    </div>
  )
}
