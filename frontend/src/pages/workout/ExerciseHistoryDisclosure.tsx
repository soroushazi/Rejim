import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import ExerciseHistoryContent from './ExerciseHistoryContent'

export type HistoryTarget = { exerciseId: number; exerciseName: string }

/** A collapsible "History" card, closed by default - one exercise's history
 * inline, or (for a superset) both exercises' stacked under their own name.
 * Replaces a per-exercise "View history" link + popup dialog, which read as
 * clumsy once there were two of them side by side in a superset. Not to be
 * confused with ExerciseHistoryCard - that one's the Progress tab's "search
 * any logged exercise's history" card, a different feature entirely. */
export default function ExerciseHistoryDisclosure({ targets }: { targets: HistoryTarget[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        History
        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-t border-border p-3">
          {targets.map((t) => (
            <div key={t.exerciseId} className="flex flex-col gap-2">
              {targets.length > 1 && <p className="text-xs font-semibold text-muted-foreground">{t.exerciseName}</p>}
              <ExerciseHistoryContent exerciseId={t.exerciseId} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
