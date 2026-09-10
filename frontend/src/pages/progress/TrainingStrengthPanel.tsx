import { ChevronDown, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { listExerciseHistory } from '@/api/loggedSets'
import { getProgressTraining } from '@/api/progress'
import type { ProgressLoggedExerciseOption } from '@/api/types'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { computePrTimeline, type PrEvent } from '@/lib/personalRecord'
import ExerciseHistoryContent from '@/pages/workout/ExerciseHistoryContent'

type Props = {
  range: { start: string; end: string }
  traineeId?: number
}

export default function TrainingStrengthPanel({ range, traineeId }: Props) {
  const [options, setOptions] = useState<ProgressLoggedExerciseOption[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [userPicked, setUserPicked] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [prEvents, setPrEvents] = useState<PrEvent[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getProgressTraining(range, traineeId)
      .then((res) => {
        if (cancelled) return
        setOptions(res.logged_exercises)
        const stillPickable = userPicked && res.logged_exercises.some((e) => e.exercise_id === selectedId)
        if (!stillPickable) {
          setSelectedId(res.exercise_id)
          setUserPicked(false)
        }
      })
      .catch(() => {
        if (!cancelled) setOptions([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end, traineeId])

  useEffect(() => {
    if (selectedId === null) {
      setPrEvents([])
      return
    }
    let cancelled = false
    // Unbounded - a PR check needs everything before it, not just the
    // selected range, so this is a separate fetch from ExerciseHistoryContent's
    // own range-scoped one for display.
    listExerciseHistory(selectedId)
      .then((history) => {
        if (!cancelled) setPrEvents(computePrTimeline(history))
      })
      .catch(() => {
        if (!cancelled) setPrEvents([])
      })
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const selected = options.find((o) => o.exercise_id === selectedId)
  const query = search.trim().toLowerCase()
  const results = options
    .filter((o) => o.exercise_name.toLowerCase().includes(query))
    .sort((a, b) => b.set_count - a.set_count)

  const rangeEvents = prEvents.filter((e) => e.date >= range.start && e.date <= range.end)

  if (loading && options.length === 0) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }
  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">No exercises logged in this range yet.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <DropdownMenu onOpenChange={(open) => !open && setSearch('')}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between gap-2 rounded-full font-normal">
            <span className="flex items-center gap-2 truncate">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              {selected ? selected.exercise_name : 'Pick an exercise…'}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
          <div className="p-1">
            <Input
              type="search"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              autoFocus
              className="h-8"
            />
          </div>
          {results.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">No matches.</p>}
          {results.map((o) => (
            <DropdownMenuItem
              key={o.exercise_id}
              onSelect={() => {
                setSelectedId(o.exercise_id)
                setUserPicked(true)
              }}
            >
              {o.exercise_name}
              <span className="ml-auto text-xs text-muted-foreground">{o.set_count} sets</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedId !== null && (
        <>
          <ExerciseHistoryContent exerciseId={selectedId} range={range} prEvents={prEvents} />

          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold">PRs in this range</p>
            {rangeEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No PRs in this range.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {rangeEvents
                  .slice()
                  .reverse()
                  .map((e, i) => (
                    <li key={`${e.date}-${e.kind}-${e.weight}-${e.reps}-${i}`} className="flex items-center justify-between">
                      <span>{new Date(`${e.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      <span className="font-medium text-foreground">
                        {e.kind === 'weight' ? `New max weight: ${e.weight}` : `New max reps @ ${e.weight}: ${e.reps}`}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
