import { useState } from 'react'
import type { WorkoutSessionLog } from '@/api/types'

export default function SessionHistoryRow({ session }: { session: WorkoutSessionLog }) {
  const [expanded, setExpanded] = useState(false)
  const exerciseCount = session.logged_exercises.length
  const setCount = session.logged_exercises.reduce((sum, le) => sum + le.sets.length, 0)

  return (
    <li className="overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex flex-col">
          <span className="font-medium">
            {new Date(`${session.date}T00:00:00`).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <span className="text-xs text-muted-foreground">{session.plan_session_label}</span>
        </div>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {exerciseCount} exercise{exerciseCount === 1 ? '' : 's'} · {setCount} set{setCount === 1 ? '' : 's'}
          {session.duration_minutes !== null ? ` · ${session.duration_minutes} min` : ''}
        </span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5">
          {session.notes.trim() !== '' && (
            <p className="rounded-md bg-muted px-2 py-1 text-sm text-muted-foreground">{session.notes}</p>
          )}
          <ul className="flex flex-col gap-2">
            {[...session.logged_exercises]
              .sort((a, b) => a.order - b.order)
              .map((le) => (
                <li key={le.id} className="text-sm">
                  <p className="font-medium">{le.exercise_name}</p>
                  <ul className="flex flex-col gap-0.5 pl-1">
                    {[...le.sets]
                      .sort((a, b) => a.set_number - b.set_number)
                      .map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-2 text-muted-foreground">
                          <span>
                            Set {s.set_number}
                            {s.is_warmup ? ' · warm-up' : ''}
                          </span>
                          <span>
                            {s.weight}
                            {s.weight_unit} × {s.reps_done}
                            {s.rpe !== null ? ` · RPE ${s.rpe}` : ''}
                          </span>
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
          </ul>
        </div>
      )}
    </li>
  )
}
