import { Camera, Dumbbell, Flame, Moon, Utensils } from 'lucide-react'
import { useEffect, useState } from 'react'
import { listGoals } from '@/api/goals'
import { getProgressOverview } from '@/api/progress'
import type { ProgressOverviewDay } from '@/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { toDateKey } from '@/lib/date'
import { useTraineeId } from '@/lib/useTraineeId'
import { toKg } from '@/lib/weightUnits'
import ConsistencyDashboard from './progress/ConsistencyDashboard'
import DateRangeControl, { resolvePreset, type RangePreset } from './progress/DateRangeControl'
import NutritionDashboard from './progress/NutritionDashboard'
import OverviewChart from './progress/OverviewChart'
import PhotosPlaceholder from './progress/PhotosPlaceholder'
import RecoveryDashboard from './progress/RecoveryDashboard'
import TrainingDashboard from './progress/TrainingDashboard'

const SECTIONS = [
  { value: 'training', label: 'Training', Icon: Dumbbell },
  { value: 'nutrition', label: 'Nutrition', Icon: Utensils },
  { value: 'recovery', label: 'Recovery', Icon: Moon },
  { value: 'consistency', label: 'Consistency', Icon: Flame },
  { value: 'photos', label: 'Photos', Icon: Camera },
] as const

export default function ProgressPage() {
  const { traineeId, picker, ready } = useTraineeId()
  const [preset, setPreset] = useState<RangePreset>('month')
  const [customStart, setCustomStart] = useState(() => resolvePreset('7d', '', '').start)
  const [customEnd, setCustomEnd] = useState(() => toDateKey(new Date()))
  const [overviewDays, setOverviewDays] = useState<ProgressOverviewDay[]>([])
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [weightGoalKg, setWeightGoalKg] = useState<number | undefined>(undefined)

  const range = resolvePreset(preset, customStart, customEnd)
  const rangeInvalid = preset === 'custom' && customStart > customEnd

  useEffect(() => {
    if (!ready || rangeInvalid) return
    let cancelled = false
    setOverviewLoading(true)
    getProgressOverview(range, traineeId)
      .then((res) => {
        if (!cancelled) setOverviewDays(res.days)
      })
      .catch(() => {
        if (!cancelled) setOverviewDays([])
      })
      .finally(() => {
        if (!cancelled) setOverviewLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, traineeId, range.start, range.end, rangeInvalid])

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    listGoals(traineeId)
      .then((goals) => {
        if (cancelled) return
        const active = goals.find((g) => g.goal_type === 'weight' && g.is_active && g.target_weight)
        setWeightGoalKg(active ? toKg(Number(active.target_weight), active.target_weight_unit!) : undefined)
      })
      .catch(() => {
        if (!cancelled) setWeightGoalKg(undefined)
      })
    return () => {
      cancelled = true
    }
  }, [ready, traineeId])

  if (!ready) {
    return picker ?? <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {picker}

      <DateRangeControl
        preset={preset}
        onPresetChange={setPreset}
        customStart={customStart}
        customEnd={customEnd}
        onCustomChange={(s, e) => {
          setCustomStart(s)
          setCustomEnd(e)
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {overviewLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <OverviewChart days={overviewDays} weightGoalKg={weightGoalKg} />
          )}
        </CardContent>
      </Card>

      {!rangeInvalid && (
        <Tabs defaultValue="training">
          {/* Icon-over-label, one row - mirrors BottomNav's own layout, which
           * already solves "5 items, no overflow, no scrolling" at this app's
           * mobile width; plain text tabs for 5 sections (incl. "Consistency")
           * don't fit on one line without either wrapping or a horizontal
           * scroll, which is exactly what this replaces the date-range pills
           * for too. */}
          <TabsList variant="line" className="h-auto w-full justify-between gap-0 bg-transparent p-0">
            {SECTIONS.map(({ value, label, Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className={cn(
                  'h-auto flex-1 flex-col gap-1 rounded-none border-none py-2 text-muted-foreground',
                  'data-active:bg-transparent data-active:text-primary data-active:shadow-none',
                )}
              >
                <Icon className="size-[20px]" strokeWidth={1.8} />
                <span className="text-center text-[10px] leading-tight font-medium">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="training" className="mt-3">
            <TrainingDashboard range={range} traineeId={traineeId} />
          </TabsContent>
          <TabsContent value="nutrition" className="mt-3">
            <NutritionDashboard range={range} traineeId={traineeId} />
          </TabsContent>
          <TabsContent value="recovery" className="mt-3">
            <RecoveryDashboard range={range} traineeId={traineeId} />
          </TabsContent>
          <TabsContent value="consistency" className="mt-3">
            <ConsistencyDashboard range={range} traineeId={traineeId} />
          </TabsContent>
          <TabsContent value="photos" className="mt-3">
            <PhotosPlaceholder />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
