import { useState } from 'react'
import type { PlanExerciseDetail, PlanSessionDetail, WorkoutPlanDetail } from '@/api/types'

function PlanExerciseRow({ exercise }: { exercise: PlanExerciseDetail }) {
  return (
    <li className="flex flex-col gap-1 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span>{exercise.exercise_name}</span>
        <span className="whitespace-nowrap text-muted-foreground">
          {exercise.target_sets}x{exercise.target_reps_min}-{exercise.target_reps_max} ·{' '}
          {exercise.default_rest_seconds}s rest
        </span>
      </div>

      {exercise.notes.trim() !== '' && (
        <p className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{exercise.notes}</p>
      )}
    </li>
  )
}

function PlanSessionCard({ session, defaultExpanded }: { session: PlanSessionDetail; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const exercises = [...session.exercises].sort((a, b) => a.order - b.order)

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3.5 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="font-semibold">{session.label}</span>
        <span className="text-xs text-muted-foreground">{exercises.length} exercises</span>
      </button>
      {expanded && (
        <div className="flex flex-col gap-3 border-t border-border px-3.5 py-3">
          {session.notes.trim() !== '' && (
            <p className="rounded-md bg-muted px-2.5 py-1.5 text-sm text-muted-foreground">{session.notes}</p>
          )}

          <ul className="flex flex-col gap-2.5">
            {exercises.map((ex) => (
              <PlanExerciseRow key={ex.id} exercise={ex} />
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}

/** Read-only view of one workout plan version - the trainee's Workout -> Plan
 * page, its upcoming-version preview, and the trainer editor's "current
 * plan" view all render through this. */
export default function WorkoutPlanView({ plan }: { plan: WorkoutPlanDetail }) {
  const sessions = [...plan.sessions].sort((a, b) => a.order - b.order)

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl bg-primary p-4 text-primary-foreground">
        <p className="text-sm font-medium opacity-90">{plan.name}</p>
        <p className="text-2xl font-semibold">
          {plan.sessions_per_week}x<span className="ml-1 text-sm font-normal opacity-80">per week</span>
        </p>
      </div>

      {sessions.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">This plan has no sessions yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((session, i) => (
            <PlanSessionCard key={session.id} session={session} defaultExpanded={i === 0} />
          ))}
        </ul>
      )}
    </div>
  )
}
