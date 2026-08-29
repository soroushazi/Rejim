import { ChevronDown, ChevronLeft, ChevronUp, Search } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import ExerciseHistoryContent from './ExerciseHistoryContent'

export type LoggedExerciseOption = { exerciseId: number; exerciseName: string }

/** Collapsible card: a search field that opens a dropdown of your logged
 * exercises (alphabetical) as soon as you click into it - before typing
 * anything - and narrows as you type. Built on the same Radix DropdownMenu
 * primitive as MultiSelectDropdown, which portals its content outside the
 * card's DOM subtree - a plain absolutely-positioned div here would get
 * clipped by the card's own `overflow-hidden` (needed for its rounded
 * corners) once the list got taller than the card. Picking one shows its
 * history inline (same chart/list as the Log-time popup, via
 * ExerciseHistoryContent). */
export default function ExerciseHistoryCard({ exercises }: { exercises: LoggedExerciseOption[] }) {
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<LoggedExerciseOption | null>(null)

  const query = search.trim().toLowerCase()
  const results = exercises
    .filter((e) => e.exerciseName.toLowerCase().includes(query))
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName))

  function reset() {
    setSearch('')
    setSelected(null)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3.5 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="font-semibold">Exercise history</span>
        {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-border px-3.5 py-3">
          {selected ? (
            <>
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-1 self-start text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="size-4" /> {selected.exerciseName}
              </button>
              <ExerciseHistoryContent exerciseId={selected.exerciseId} />
            </>
          ) : (
            <DropdownMenu onOpenChange={(open) => !open && setSearch('')}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2 rounded-full font-normal text-muted-foreground"
                >
                  <Search className="size-4" />
                  Search your logged exercises…
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
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
                {exercises.length === 0 && (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">No exercises logged yet.</p>
                )}
                {exercises.length > 0 && results.length === 0 && (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">No matches.</p>
                )}
                {results.map((e) => (
                  <DropdownMenuItem key={e.exerciseId} onSelect={() => setSelected(e)}>
                    {e.exerciseName}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  )
}
