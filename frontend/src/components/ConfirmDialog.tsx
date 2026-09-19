import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  /** Shown on the confirm button while `onConfirm` is pending, in place of `confirmLabel`. */
  confirmingLabel?: string
  /** The confirm button's variant - 'destructive' (default) for a delete/remove action,
   * 'default' for a non-destructive save (e.g. confirming a status change). */
  variant?: 'destructive' | 'default'
  onConfirm: () => Promise<unknown> | void
}

/** A small app-styled "are you sure?" card, in place of the browser's native
 * window.confirm popup - used for destructive actions like deleting a meal, and for
 * any other change (e.g. a status change) that should be staged then explicitly saved. */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  confirmingLabel = 'Deleting…',
  variant = 'destructive',
  onConfirm,
}: ConfirmDialogProps) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (!next) setError(null)
    onOpenChange(next)
  }

  async function handleConfirm() {
    setError(null)
    setConfirming(true)
    try {
      await onConfirm()
      handleOpenChange(false)
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant={variant} size="sm" disabled={confirming} onClick={handleConfirm}>
            {confirming ? confirmingLabel : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
