import type { FrequencyStats } from '@/lib/workoutFrequency'
import type { StreakResult } from '@/lib/workoutStreak'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { round } from '@/lib/utils'

export default function WorkoutStatsSummary({
  periodLabel,
  frequency,
  streak,
}: {
  periodLabel: string
  frequency: FrequencyStats | null
  streak: StreakResult
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="bg-primary text-primary-foreground">
        <CardHeader>
          <CardTitle className="text-primary-foreground">{periodLabel} frequency</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {frequency ? (
            <>
              <p className="text-lg font-semibold">Every {round(frequency.avgGapDays)}d</p>
              <p className="text-xs opacity-80">{round(frequency.avgRestDays)} rest days between sessions</p>
            </>
          ) : (
            <p className="text-sm opacity-80">Not enough sessions yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-primary text-primary-foreground">
        <CardHeader>
          <CardTitle className="text-primary-foreground">Consistency streak</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <p className="text-lg font-semibold">
            {streak.streakWeeks}
            <span className="ml-1 text-sm font-normal opacity-80">
              week{streak.streakWeeks === 1 ? '' : 's'}
            </span>
          </p>
          <p className="text-xs opacity-80">
            This week: {streak.currentWeekCount}/{streak.currentWeekTarget}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
