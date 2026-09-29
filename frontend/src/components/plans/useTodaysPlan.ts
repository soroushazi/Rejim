import { useEffect, useState } from 'react'
import type { PlanForDate } from '@/api/types'
import { toDateKey } from '@/lib/date'

/** Loads the trainee's plan version for today plus, if the trainer has
 * scheduled a change, a lazily-fetched read-only preview of it. Shared by the
 * Diet and Workout "Plan" pages. */
export function useTodaysPlan<Detail, Summary extends { id: number; effective_from: string | null }>(
  getForDate: (date: string) => Promise<PlanForDate<Detail, Summary>>,
  getDetail: (id: number) => Promise<Detail>,
) {
  const [data, setData] = useState<PlanForDate<Detail, Summary> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<Detail | null>(null)

  useEffect(() => {
    let cancelled = false
    getForDate(toDateKey(new Date()))
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function togglePreview() {
    const upcoming = data?.upcoming
    if (!upcoming) return
    if (!previewing && !preview) getDetail(upcoming.id).then(setPreview).catch(() => setPreviewing(false))
    setPreviewing((v) => !v)
  }

  return {
    loading,
    error,
    plan: data?.plan ?? null,
    upcoming: data?.upcoming ?? null,
    previewing,
    /** What to render right now: the preview while previewing (null until
     * it's fetched), otherwise today's plan. */
    shown: previewing ? preview : (data?.plan ?? null),
    togglePreview,
  }
}
