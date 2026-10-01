import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'

/** What WorkoutLogPage reads from router state to open a past log straight
 * into its editing form. `planSessionId` is optional - exercise history only
 * knows the date, in which case the page edits whatever was logged that day. */
export type EditWorkoutLogState = { editWorkoutLog: { date: string; planSessionId?: number } }

/** "Edit" for an already-logged workout seen from history (Progress tab,
 * Workout -> Progress). Confirms first, since it leaves the history view for
 * the Log tab's editing form. */
export default function EditWorkoutLogButton({ date, planSessionId }: { date: string; planSessionId?: number }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const label = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" /> Edit workout
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        variant="default"
        title="Edit this workout?"
        description={`You're about to edit the workout you logged on ${label}. Any changes you save will replace what's logged now.`}
        confirmLabel="Edit workout"
        confirmingLabel="Opening…"
        onConfirm={() => {
          const state: EditWorkoutLogState = { editWorkoutLog: { date, planSessionId } }
          navigate('/workout/log', { state })
        }}
      />
    </>
  )
}
