import { useEffect, useState } from 'react'
import { listTrainees } from '@/api/accounts'
import type { User } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/** A trainer picks which of their trainees to view (same pattern used by the
 * Trainer tab and Progress tab's per-page trainee Select - there's no shared
 * "which trainee am I viewing" concept elsewhere in the app yet). Returns
 * `undefined` while a trainee is viewing their own data, since every
 * trainee-scoped endpoint treats a missing trainee id as "self" for a
 * trainee caller. */
export function useTraineeId(): {
  traineeId: number | undefined
  /** The selected trainee's full User record (e.g. for current_weight_kg),
   * or null while viewing as a trainee/none selected yet. */
  trainee: User | null
  picker: React.ReactNode
  ready: boolean
} {
  const { viewMode } = useAuth()
  const [trainees, setTrainees] = useState<User[] | null>(null)
  const [selected, setSelected] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (viewMode !== 'trainer') return
    listTrainees()
      .then((data) => {
        setTrainees(data)
        setSelected((prev) => prev ?? data[0]?.id)
      })
      .catch(() => setTrainees([]))
  }, [viewMode])

  if (viewMode !== 'trainer') {
    return { traineeId: undefined, trainee: null, picker: null, ready: true }
  }
  if (trainees === null) {
    return { traineeId: undefined, trainee: null, picker: null, ready: false }
  }
  if (trainees.length === 0) {
    return {
      traineeId: undefined,
      trainee: null,
      picker: <p className="text-sm text-muted-foreground">You have no trainees yet.</p>,
      ready: false,
    }
  }

  const picker =
    trainees.length > 1 ? (
      <Select value={String(selected)} onValueChange={(v) => setSelected(Number(v))}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {trainees.map((t) => (
            <SelectItem key={t.id} value={String(t.id)}>
              {t.username}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : null

  const trainee = trainees.find((t) => t.id === selected) ?? null
  return { traineeId: selected, trainee, picker, ready: selected !== undefined }
}
