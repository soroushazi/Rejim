import { useEffect, useState } from 'react'
import { listPlanChangeLog } from '@/api/planChangeLog'
import type { PlanChangeLogEntry } from '@/api/types'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Chronological "Workout plan updated, Sep 3" list shown at the top of the
 * Diet/Workout plan editors - see connection.models.PlanChangeLog. */
export default function PlanHistoryList({ traineeId, planType }: { traineeId: number; planType: 'diet' | 'workout' }) {
  const [entries, setEntries] = useState<PlanChangeLogEntry[] | null>(null)

  useEffect(() => {
    listPlanChangeLog(traineeId, planType)
      .then(setEntries)
      .catch(() => setEntries([]))
  }, [traineeId, planType])

  if (!entries || entries.length === 0) return null

  return (
    <details className="rounded-lg border border-border px-3 py-2 text-sm">
      <summary className="cursor-pointer font-medium text-muted-foreground">Change history ({entries.length})</summary>
      <ul className="mt-2 flex flex-col gap-1">
        {entries.map((entry) => (
          <li key={entry.id} className="text-xs text-muted-foreground">
            {entry.summary}, {formatDate(entry.created_at)}
          </li>
        ))}
      </ul>
    </details>
  )
}
