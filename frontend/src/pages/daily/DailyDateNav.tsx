import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addDays, toDateKey } from '@/lib/date'

type Props = {
  date: string
  onChange: (date: string) => void
}

function formatLabel(date: string, today: string) {
  if (date === today) return 'Today'
  if (date === addDays(today, -1)) return 'Yesterday'
  const d = new Date(`${date}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function DailyDateNav({ date, onChange }: Props) {
  const today = toDateKey(new Date())

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
      <Button type="button" size="icon-sm" variant="outline" onClick={() => onChange(addDays(date, -1))} aria-label="Previous day">
        <ChevronLeft className="size-4" />
      </Button>
      <div className="flex flex-1 items-center justify-center gap-2">
        <span className="font-semibold">{formatLabel(date, today)}</span>
        <Input
          type="date"
          value={date}
          max={today}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="w-auto"
        />
      </div>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        onClick={() => onChange(addDays(date, 1))}
        disabled={date >= today}
        aria-label="Next day"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
