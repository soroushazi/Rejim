import type { ProgressNutritionDay } from '@/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function formatKcal(value: number) {
  const rounded = Math.round(value)
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded).toLocaleString()} kcal`
}

// Deliberately not colored good/bad: a deficit is the point of a weight-loss
// goal but the opposite of a gain goal, so the sign and label carry it alone.
function directionLabel(value: number) {
  const rounded = Math.round(value)
  return rounded < 0 ? 'Deficit' : rounded > 0 ? 'Surplus' : 'Even'
}

/** Calories eaten minus calories out (the Daily tab's TDEE estimate) across the
 * selected range - summed and averaged over days with food logged only, since
 * an unlogged day would otherwise read as a full-TDEE deficit. Follows the
 * macro trend chart's hovered day, same as ProgressSummaryCard above it. */
export default function NetCaloriesCard({
  days,
  hovered,
}: {
  days: ProgressNutritionDay[]
  hovered: ProgressNutritionDay | null
}) {
  if (days.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Net calories</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No food logged in this range yet.</p>
        </CardContent>
      </Card>
    )
  }

  const shown = hovered ? [hovered] : days
  const total = shown.reduce((sum, d) => sum + d.net_calories, 0)
  const eaten = shown.reduce((sum, d) => sum + (d.consumed.calories ?? 0), 0)
  const out = shown.reduce((sum, d) => sum + d.calories_out, 0)
  const isEstimate = shown.some((d) => d.calories_out_is_estimate)
  const prefix = isEstimate ? '≈' : ''

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Net calories
          {hovered && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {new Date(`${hovered.date}T00:00:00`).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold">
            {prefix}
            {formatKcal(total)}
          </span>
          <span className="text-sm font-medium text-muted-foreground">{directionLabel(total)}</span>
        </div>
        {!hovered && days.length > 1 && (
          <p className="text-sm">
            {prefix}
            {formatKcal(total / days.length)} per day on average
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {Math.round(eaten).toLocaleString()} kcal eaten − {prefix}
          {Math.round(out).toLocaleString()} kcal out
          {!hovered && ` · ${days.length} ${days.length === 1 ? 'day' : 'days'} with food logged`}
        </p>
        {isEstimate && (
          <p className="text-xs text-muted-foreground">
            ≈ Calories out is a rougher estimate on {hovered ? 'this day' : 'some days'} (no watch total or logged
            workout calories, or missing height/age/weight in Profile).
          </p>
        )}
      </CardContent>
    </Card>
  )
}
