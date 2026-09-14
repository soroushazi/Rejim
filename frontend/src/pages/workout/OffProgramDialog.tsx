import { ChevronDown, Link2, RotateCcw, Search } from 'lucide-react'
import { useState } from 'react'
import type { Exercise, PlanExerciseDetail } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  effectiveExerciseId,
  effectiveSupersetPartner,
  withPairing,
  withSubstitution,
  withUnpair,
  type ExerciseOverrideMap,
} from '@/lib/exerciseOverrides'

function SwitchExercisePicker({
  planExercise,
  currentExerciseId,
  exerciseBank,
  exerciseBankById,
  onPick,
  onReset,
}: {
  planExercise: PlanExerciseDetail
  currentExerciseId: number
  exerciseBank: Exercise[]
  exerciseBankById: Map<number, Exercise>
  onPick: (exerciseId: number) => void
  onReset: () => void
}) {
  const [search, setSearch] = useState('')
  const isSubstituted = currentExerciseId !== planExercise.exercise
  const planned = exerciseBankById.get(planExercise.exercise)
  const alternatives = (planned?.alternatives ?? [])
    .map((id) => exerciseBankById.get(id))
    .filter((e): e is Exercise => !!e && e.id !== currentExerciseId)

  const query = search.trim().toLowerCase()
  const results = query
    ? exerciseBank.filter((e) => e.id !== currentExerciseId && e.name.toLowerCase().includes(query))
    : exerciseBank.filter((e) => e.id !== currentExerciseId && !alternatives.some((alt) => alt.id === e.id))

  return (
    <div className="flex flex-col gap-1.5">
      <DropdownMenu onOpenChange={(open) => !open && setSearch('')}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="w-full justify-between gap-2 font-normal">
            <span className="flex min-w-0 items-center gap-2 truncate">
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              {isSubstituted ? exerciseBankById.get(currentExerciseId)?.name : 'Switch exercise…'}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[min(24rem,var(--radix-dropdown-menu-trigger-width))]">
          <div className="p-1">
            <Input
              type="search"
              placeholder="Search exercises…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              autoFocus
              className="h-8"
            />
          </div>
          {!query && alternatives.length > 0 && (
            <>
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Suggested alternatives</p>
              {alternatives.map((alt) => (
                <DropdownMenuItem key={alt.id} onSelect={() => onPick(alt.id)}>
                  {alt.name}
                </DropdownMenuItem>
              ))}
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">All exercises</p>
            </>
          )}
          {results.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">No matches.</p>}
          {results.map((ex) => (
            <DropdownMenuItem key={ex.id} onSelect={() => onPick(ex.id)}>
              {ex.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {isSubstituted && (
        <Button type="button" variant="link" size="sm" className="h-auto w-fit gap-1 px-0" onClick={onReset}>
          <RotateCcw className="size-3" /> Revert to planned ({planExercise.exercise_name})
        </Button>
      )}
    </div>
  )
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  exerciseOrder: number[]
  exercisesById: Map<number, PlanExerciseDetail>
  exerciseBank: Exercise[]
  exerciseBankById: Map<number, Exercise>
  overrides: ExerciseOverrideMap
  onOverridesChange: (next: ExerciseOverrideMap) => void
}

/** Lets a trainee adjust *today's* log without touching the trainer's plan:
 * swap an exercise for a different one (e.g. their usual equipment is taken),
 * and/or ad hoc pair/unpair exercises as a superset for this session only.
 * Both are per-log overrides - see ExerciseOverride. */
export default function OffProgramDialog({
  open,
  onOpenChange,
  exerciseOrder,
  exercisesById,
  exerciseBank,
  exerciseBankById,
  overrides,
  onOverridesChange,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Off-program exercise</DialogTitle>
        </DialogHeader>
        <p className="-mt-2 text-sm text-muted-foreground">
          Swap an exercise or adjust supersets for today's log only - your trainer's plan won't change.
        </p>
        <div className="flex flex-col gap-4">
          {exerciseOrder.map((peId) => {
            const pe = exercisesById.get(peId)
            if (!pe) return null
            const currentExerciseId = effectiveExerciseId(pe, overrides)
            const partnerId = effectiveSupersetPartner(peId, exercisesById, overrides)

            return (
              <div key={peId} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{pe.exercise_name}</p>

                <SwitchExercisePicker
                  planExercise={pe}
                  currentExerciseId={currentExerciseId}
                  exerciseBank={exerciseBank}
                  exerciseBankById={exerciseBankById}
                  onPick={(exerciseId) => onOverridesChange(withSubstitution(overrides, peId, exerciseId))}
                  onReset={() => onOverridesChange(withSubstitution(overrides, peId, null))}
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="w-full justify-between gap-2 font-normal">
                      <span className="flex min-w-0 items-center gap-2 truncate">
                        <Link2 className={partnerId !== null ? 'size-3.5 shrink-0 text-primary' : 'size-3.5 shrink-0 text-muted-foreground'} />
                        {partnerId !== null
                          ? `Superset with ${exercisesById.get(partnerId)?.exercise_name ?? '…'}`
                          : 'No superset'}
                      </span>
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                    <DropdownMenuItem onSelect={() => onOverridesChange(withUnpair(overrides, exercisesById, peId))}>
                      No superset
                    </DropdownMenuItem>
                    {exerciseOrder
                      .filter((otherId) => otherId !== peId)
                      .map((otherId) => {
                        const other = exercisesById.get(otherId)
                        if (!other) return null
                        return (
                          <DropdownMenuItem
                            key={otherId}
                            onSelect={() => onOverridesChange(withPairing(overrides, exercisesById, peId, otherId))}
                          >
                            Pair with {other.exercise_name}
                          </DropdownMenuItem>
                        )
                      })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
        </div>
        <Button type="button" className="mt-2" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      </DialogContent>
    </Dialog>
  )
}
