import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { LoggedMeal, Nutrients } from '@/api/types'
import DietHistoryDialog from './DietHistoryDialog'

type Props = {
  loggedMeals: LoggedMeal[]
  target: Nutrients
}

export default function DietHistoryCard({ loggedMeals, target }: Props) {
  const [open, setOpen] = useState(false)
  const mostRecent = [...loggedMeals].sort((a, b) => b.date.localeCompare(a.date))[0]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3.5 py-3 text-left"
      >
        <div className="flex flex-col">
          <span className="font-semibold">Diet history</span>
          <span className="text-xs text-muted-foreground">
            {mostRecent
              ? `Last: ${new Date(`${mostRecent.date}T00:00:00`).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}`
              : 'No meals logged yet'}
          </span>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </button>

      <DietHistoryDialog open={open} onOpenChange={setOpen} loggedMeals={loggedMeals} target={target} />
    </>
  )
}
