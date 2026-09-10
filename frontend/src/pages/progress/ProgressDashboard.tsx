import { Camera, Dumbbell, Flame, Moon, Utensils } from 'lucide-react'
import { useEffect, useState } from 'react'
import { listGoals } from '@/api/goals'
import { getProgressOverview } from '@/api/progress'
import type { ProgressOverviewDay } from '@/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { toDateKey } from '@/lib/date'
import { toKg } from '@/lib/weightUnits'
import ConsistencyDashboard from './ConsistencyDashboard'
import DateRangeControl, { resolvePreset, type RangePreset } from './DateRangeControl'
import NutritionDashboard from './NutritionDashboard'
import OverviewChart from './OverviewChart'
import PhotosPlaceholder from './PhotosPlaceholder'
import RecoveryDashboard from './RecoveryDashboard'
import TrainingDashboard from './TrainingDashboard'

const SECTIONS = [
  { value: 'training', label: 'Training', Icon: Dumbbell },
  { value: 'nutrition', label: 'Nutrition', Icon: Utensils },
  { value: 'recovery', label: 'Recovery', Icon: Moon },
  { value: 'consistency', label: 'Consistency', Icon: Flame },
  { value: 'photos', label: 'Photos', Icon: Camera },
] as const

/** The dashboard body extracted from ProgressPage so TraineeDetailPage's
 * Progress tab can render it directly with an already-known traineeId, with
 * no trainee-picker involved - ProgressPage wraps this with useTraineeId(). */
export default function ProgressDashboard({ traineeId }: { traineeId?: number }) {
  const [preset, setPreset] = useState<RangePreset>('month')
  const [customStart, setCustomStart] = useState(() => resolvePreset('7d', '', '').start)
  const [customEnd, setCustomEnd] = useState(() => toDateKey(new Date()))
  const [overviewDays, setOverviewDays] = useState<ProgressOverviewDay[]>([])
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [weightGoalKg, setWeightGoalKg] = useState<number | undefined>(undefined)

  const range = resolvePreset(preset, customStart, customEnd)
  const rangeInvalid = preset === 'custom' && customStart > customEnd

  useEffect(() => {
    if (rangeInvalid) return
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
  }, [traineeId, range.start, range.end, rangeInvalid])

  useEffect(() => {
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
  }, [traineeId])

  return (
    <div className="flex flex-col gap-3">
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
