import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { WorkoutSessionLog } from '@/api/types'
import SessionHistoryDialog from './SessionHistoryDialog'

export default function SessionHistoryCard({ sessions }: { sessions: WorkoutSessionLog[] }) {
  const [open, setOpen] = useState(false)
  const mostRecent = [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3.5 py-3 text-left"
      >
        <div className="flex flex-col">
          <span className="font-semibold">Session history</span>
          <span className="text-xs text-muted-foreground">
            {mostRecent
              ? `Last: ${new Date(`${mostRecent.date}T00:00:00`).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}`
              : 'No sessions logged yet'}
          </span>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </button>

      <SessionHistoryDialog open={open} onOpenChange={setOpen} sessions={sessions} />
    </>
  )
}
