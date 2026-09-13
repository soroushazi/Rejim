import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

type RequestEditDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  onSubmit: (description: string) => Promise<unknown>
}

/** Shared by the Exercise Bank and Food Bank: a trainee can't edit shared
 * reference data directly, so this lets them flag a freeform correction for a
 * trainer to act on (see ExerciseEditRequest/FoodItemEditRequest). */
export default function RequestEditDialog({ open, onOpenChange, itemName, onSubmit }: RequestEditDialogProps) {
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setDescription('')
      setError(null)
    }
    onOpenChange(next)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!description.trim()) {
      setError('Description is required.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(description.trim())
      handleOpenChange(false)
    } catch {
      setError('Could not send this request. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request edit</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <p className="text-sm text-muted-foreground">
            Tell your trainer what should change about “{itemName}”.
          </p>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="e.g. The calories look too high for this serving size"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send request'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
