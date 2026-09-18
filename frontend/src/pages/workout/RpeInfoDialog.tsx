import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RPE_OPTIONS } from '@/lib/rpe'

const RPE_DESCRIPTIONS: Record<number, string> = {
  5: 'You could have done several more reps - a light or warm-up-adjacent set.',
  7: "Comfortably challenging - you could have done about 2-3 more reps.",
  9: 'Very demanding - maybe 1 more rep left in the tank.',
  10: "Couldn't have done another rep with good form.",
}

export default function RpeInfoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>What is RPE?</DialogTitle>
          <DialogDescription>
            RPE (Rate of Perceived Exertion) is how hard a set felt, on a scale where 10 means you couldn't have
            done another rep. It helps you and your trainer see how close to your limit each set really was - two
            sets with the same weight and reps can still feel very different. Pick whichever option below best
            matches how the set felt.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2.5">
          {RPE_OPTIONS.map((o) => (
            <li key={o.value} className="rounded-md border border-border p-2.5 text-sm">
              <span className="font-medium">
                {o.label} <span className="text-muted-foreground">(RPE {o.value})</span>
              </span>
              <p className="mt-0.5 text-muted-foreground">{RPE_DESCRIPTIONS[o.value]}</p>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
