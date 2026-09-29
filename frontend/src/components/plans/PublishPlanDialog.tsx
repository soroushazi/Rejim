import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { addDays, toDateKey } from '@/lib/date'
import { cn } from '@/lib/utils'

type When = 'now' | 'date'

function ChoiceRow({
  selected,
  onSelect,
  title,
  description,
  children,
}: {
  selected: boolean
  onSelect: () => void
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect()
      }}
      className={cn(
        'flex cursor-pointer flex-col gap-2 rounded-lg border p-3 text-left',
        selected ? 'border-primary bg-primary/5' : 'border-border',
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            'mt-0.5 size-4 shrink-0 rounded-full border',
            selected ? 'border-[5px] border-primary' : 'border-muted-foreground/50',
          )}
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      </div>
      {children}
    </div>
  )
}

/** Picks when a plan version takes effect: immediately, or from a future
 * date. Used both to publish a draft and to move an already-scheduled change.
 * Mount it only while open (`{open && <PublishPlanDialog … />}`) so each
 * opening starts from `initialDate` afresh. */
export default function PublishPlanDialog({
  open,
  onOpenChange,
  initialDate,
  onPublish,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The currently scheduled start date, when rescheduling. */
  initialDate?: string | null
  onPublish: (effectiveFrom: string) => Promise<unknown>
}) {
  const today = toDateKey(new Date())
  const tomorrow = addDays(today, 1)
  const [when, setWhen] = useState<When>(initialDate ? 'date' : 'now')
  const [date, setDate] = useState(initialDate ?? tomorrow)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dateInvalid = when === 'date' && (!date || date <= today)

  async function handlePublish() {
    setSaving(true)
    setError(null)
    try {
      await onPublish(when === 'now' ? today : date)
      onOpenChange(false)
    } catch {
      setError("Couldn't publish the plan. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{initialDate ? 'Change start date' : 'When should this take effect?'}</DialogTitle>
        </DialogHeader>
        <div role="radiogroup" className="flex flex-col gap-2">
          <ChoiceRow
            selected={when === 'now'}
            onSelect={() => setWhen('now')}
            title="Immediately"
            description="Replaces the current plan from today. Any day your trainee has already started logging stays on the plan they logged it against."
          />
          <ChoiceRow
            selected={when === 'date'}
            onSelect={() => setWhen('date')}
            title="Starting on a date"
            description="The current plan stays in place until then. You can keep editing this version, or cancel it, until it starts."
          >
            {when === 'date' && (
              <Input
                type="date"
                value={date}
                min={tomorrow}
                onChange={(e) => setDate(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-fit"
              />
            )}
          </ChoiceRow>
        </div>
        {dateInvalid && <p className="text-sm text-destructive">Pick a date after today.</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={saving || dateInvalid} onClick={handlePublish}>
            {saving ? 'Saving…' : when === 'now' ? 'Publish now' : 'Schedule'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
