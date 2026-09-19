import { Camera, Dumbbell, Flame, Moon, Utensils } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { listGoals } from '@/api/goals'
import { getProgressOverview } from '@/api/progress'
import type { ProgressOverviewDay, User } from '@/api/types'
import { Card, CardContent } from '@/components/ui/card'
import { ChartEmptyState } from '@/components/charts/ZoomableChart'
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
 * no trainee-picker involved - ProgressPage wraps this with useTraineeId().
 * `trainee` (the full User record) is only needed to resolve which unit a
 * trainer viewing this trainee's weights should see them in - see
 * usePreferredWeightUnit. */
export default function ProgressDashboard({ traineeId, trainee }: { traineeId?: number; trainee?: User | null }) {
  const [preset, setPreset] = useState<RangePreset>('7d')
  const [customStart, setCustomStart] = useState(() => resolvePreset('7d', '', '').start)
  const [customEnd, setCustomEnd] = useState(() => toDateKey(new Date()))
  const [overviewDays, setOverviewDays] = useState<ProgressOverviewDay[]>([])
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [weightGoalKg, setWeightGoalKg] = useState<number | undefined>(undefined)
  const sectionTabsRef = useRef<HTMLDivElement>(null)

  // Pin the section tab bar right under the app's own sticky header (it
  // occupies the real top of the viewport - scrolling to y=0 would tuck the
  // tab bar behind it, not "above the page"). `scroll-mt` below tells
  // scrollIntoView to stop there instead of at the very top.
  function handleSectionChange() {
    requestAnimationFrame(() => {
      sectionTabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

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
        <CardContent>
          {overviewLoading ? (
            <ChartEmptyState title="Overview" message="Loading…" />
          ) : (
            <OverviewChart days={overviewDays} weightGoalKg={weightGoalKg} trainee={trainee} />
          )}
        </CardContent>
      </Card>

      {!rangeInvalid && (
        <Tabs defaultValue="training" onValueChange={handleSectionChange}>
          <div
            ref={sectionTabsRef}
            className="sticky z-10 -mx-4 bg-background px-4"
            style={{
              top: 'calc(var(--header-height) + env(safe-area-inset-top))',
              scrollMarginTop: 'calc(var(--header-height) + env(safe-area-inset-top))',
            }}
          >
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
          </div>
          {/* min-height guarantees enough room to scroll even the shortest
              section (e.g. Photos, or Nutrition with no diet plan set) far
              enough for the tab bar above to actually reach its pinned spot. */}
          <div className="min-h-[calc(100dvh-var(--header-height)-env(safe-area-inset-top))]">
            <TabsContent value="training" className="mt-3">
              <TrainingDashboard range={range} traineeId={traineeId} trainee={trainee} />
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
          </div>
        </Tabs>
      )}
    </div>
  )
}
