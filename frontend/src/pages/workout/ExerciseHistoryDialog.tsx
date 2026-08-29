import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ExerciseHistoryContent from './ExerciseHistoryContent'

type Props = {
  exerciseId: number | null
  exerciseName: string
  onOpenChange: (open: boolean) => void
}

export default function ExerciseHistoryDialog({ exerciseId, exerciseName, onOpenChange }: Props) {
  return (
    <Dialog open={exerciseId !== null} onOpenChange={(next) => !next && onOpenChange(false)}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{exerciseName}</DialogTitle>
        </DialogHeader>
        {exerciseId !== null && <ExerciseHistoryContent exerciseId={exerciseId} />}
      </DialogContent>
    </Dialog>
  )
}
