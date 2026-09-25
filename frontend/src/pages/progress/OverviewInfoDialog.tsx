import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function OverviewInfoDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>About this chart</DialogTitle>
          <DialogDescription>
            Weight is plotted two ways, toggled independently via their own legend pills.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2.5">
          <li className="rounded-md border border-border p-2.5 text-sm">
            <span className="font-medium">Weight</span>
            <p className="mt-0.5 text-muted-foreground">
              Your actual logged reading for that day - it can swing quite a bit day to day (water, food volume,
              time of day, ...), so on its own it's a noisy picture of how your weight is really trending.
            </p>
          </li>
          <li className="rounded-md border border-border p-2.5 text-sm">
            <span className="font-medium">Average weight</span>
            <p className="mt-0.5 text-muted-foreground">
              A 7-day trailing average - the mean of whatever readings fall in the 7 days ending on that date, not
              just your last 7 logged weigh-ins. It smooths out day-to-day noise, so it's usually the better line
              to watch for the actual trend.
            </p>
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  )
}
