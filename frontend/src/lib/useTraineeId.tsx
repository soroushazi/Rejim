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
export function useTraineeId(): { traineeId: number | undefined; picker: React.ReactNode; ready: boolean } {
  const { user } = useAuth()
  const [trainees, setTrainees] = useState<User[] | null>(null)
  const [selected, setSelected] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (user?.role !== 'trainer') return
    listTrainees()
      .then((data) => {
        setTrainees(data)
        setSelected((prev) => prev ?? data[0]?.id)
      })
      .catch(() => setTrainees([]))
  }, [user?.role])

  if (user?.role !== 'trainer') {
    return { traineeId: undefined, picker: null, ready: true }
  }
  if (trainees === null) {
    return { traineeId: undefined, picker: null, ready: false }
  }
  if (trainees.length === 0) {
    return { traineeId: undefined, picker: <p className="text-sm text-muted-foreground">You have no trainees yet.</p>, ready: false }
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

  return { traineeId: selected, picker, ready: selected !== undefined }
}
