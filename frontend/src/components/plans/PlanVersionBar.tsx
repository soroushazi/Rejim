import { useState } from 'react'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateKey } from '@/lib/date'
import { cn } from '@/lib/utils'
import PublishPlanDialog from './PublishPlanDialog'

type Version = { effective_from: string | null; status: string }

export type PlanVersionView = 'pending' | 'current'

/** The trainer editor's version controls (see backend accounts/plan_versions.py):
 * the live plan is read-only; "Edit plan" starts a draft copy, which is then
 * published immediately or scheduled from a date - and a scheduled change
 * stays editable (or cancellable) until it starts. */
export default function PlanVersionBar({
  noun,
  current,
  pending,
  view,
  onViewChange,
  onStartEdit,
  onPublish,
  onDiscard,
}: {
  /** "diet plan" / "workout plan" */
  noun: string
  current: Version | null
  pending: Version | null
  view: PlanVersionView
  onViewChange: (view: PlanVersionView) => void
  onStartEdit: () => Promise<unknown>
  onPublish: (effectiveFrom: string) => Promise<unknown>
  onDiscard: () => Promise<unknown>
}) {
  const [starting, setStarting] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const scheduledFor = pending?.status === 'scheduled' ? pending.effective_from : null

  async function handleStartEdit() {
    setStarting(true)
    try {
      await onStartEdit()
    } finally {
      setStarting(false)
    }
  }

  return (
    <Card className={cn(pending && 'border-primary/40')}>
      <CardContent className="flex flex-col gap-3">
        {!pending && current && (
          <>
            <div className="flex flex-col gap-0.5">
              <p className="font-semibold">Current {noun}</p>
              <p className="text-sm text-muted-foreground">
                In effect since {current.effective_from ? formatDateKey(current.effective_from) : '—'}. To change it,
                start an edit - your trainee keeps this plan until you publish the new version.
              </p>
            </div>
            <Button type="button" size="sm" className="w-fit" disabled={starting} onClick={handleStartEdit}>
              {starting ? 'Starting…' : 'Edit plan'}
            </Button>
          </>
        )}

        {pending && (
          <>
            <div className="flex flex-col gap-0.5">
              <p className="font-semibold">
                {scheduledFor ? `Scheduled to start ${formatDateKey(scheduledFor)}` : 'Draft - not visible to your trainee yet'}
              </p>
              <p className="text-sm text-muted-foreground">
                {scheduledFor
                  ? 'Your trainee sees a notice and can preview it. You can keep editing it until it starts.'
                  : `Edits here only reach your trainee once you publish them${current ? ' - the current plan stays in place until then' : ''}.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => setPublishOpen(true)}>
                {scheduledFor ? 'Change start date' : 'Publish…'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setDiscardOpen(true)}>
                {scheduledFor ? 'Cancel scheduled change' : 'Discard draft'}
              </Button>
            </div>
            {current && (
              <div className="flex rounded-lg bg-muted p-0.5 text-sm">
                {(['pending', 'current'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onViewChange(v)}
                    className={cn(
                      'flex-1 rounded-md px-2 py-1.5 font-medium',
                      view === v ? 'bg-background shadow-sm' : 'text-muted-foreground',
                    )}
                  >
                    {v === 'pending' ? 'New version' : 'Current plan'}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>

      {publishOpen && (
        <PublishPlanDialog open onOpenChange={setPublishOpen} initialDate={scheduledFor} onPublish={onPublish} />
      )}
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title={scheduledFor ? 'Cancel the scheduled change?' : 'Discard this draft?'}
        description={`All edits in this version are lost.${current ? ` The current ${noun} stays as it is.` : ''}`}
        confirmLabel={scheduledFor ? 'Cancel change' : 'Discard'}
        confirmingLabel="Discarding…"
        onConfirm={onDiscard}
      />
    </Card>
  )
}
