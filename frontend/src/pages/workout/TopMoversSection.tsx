import { TrendingDown, TrendingUp } from 'lucide-react'
import type { ExerciseMover } from '@/lib/topMovers'
import { round } from '@/lib/utils'

function MoverRow({ mover, onClick }: { mover: ExerciseMover; onClick: () => void }) {
  const positive = mover.percentChange > 0
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
      >
        <span className="min-w-0 flex-1 truncate">{mover.exerciseName}</span>
        <span className={positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}>
          {positive ? '+' : ''}
          {round(mover.percentChange)}%
        </span>
      </button>
    </li>
  )
}

export default function TopMoversSection({
  improving,
  declining,
  onSelectExercise,
}: {
  improving: ExerciseMover[]
  declining: ExerciseMover[]
  onSelectExercise: (exerciseId: number, exerciseName: string) => void
}) {
  if (improving.length === 0 && declining.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-sm font-semibold">
          <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" /> Improving
        </div>
        {improving.length > 0 ? (
          <ul className="flex flex-col">
            {improving.map((m) => (
              <MoverRow key={m.exerciseId} mover={m} onClick={() => onSelectExercise(m.exerciseId, m.exerciseName)} />
            ))}
          </ul>
        ) : (
          <p className="px-3 py-2 text-sm text-muted-foreground">Not enough data yet.</p>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-sm font-semibold">
          <TrendingDown className="size-4 text-destructive" /> Declining
        </div>
        {declining.length > 0 ? (
          <ul className="flex flex-col">
            {declining.map((m) => (
              <MoverRow key={m.exerciseId} mover={m} onClick={() => onSelectExercise(m.exerciseId, m.exerciseName)} />
            ))}
          </ul>
        ) : (
          <p className="px-3 py-2 text-sm text-muted-foreground">Not enough data yet.</p>
        )}
      </div>
    </div>
  )
}
