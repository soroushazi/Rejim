import { useEffect, useState } from 'react'
import { getDietPlan, listDietPlans } from '@/api/dietPlan'
import type { DietPlanDetail } from '@/api/types'
import { Button } from '@/components/ui/button'
import LogDayCard from './LogDayCard'

const DAYS_PER_PAGE = 6

function toDateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(dateKey: string, delta: number) {
  const d = new Date(`${dateKey}T00:00:00`)
  d.setDate(d.getDate() + delta)
  return toDateKey(d)
}

export default function LogPage() {
  const [plan, setPlan] = useState<DietPlanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [days, setDays] = useState<string[]>(() => [toDateKey(new Date())])

  useEffect(() => {
    let cancelled = false
    listDietPlans()
      .then((plans) => (plans.length ? getDietPlan(plans[0].id) : null))
      .then((detail) => {
        if (!cancelled) {
          setPlan(detail)
          setError(false)
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function loadEarlierDays() {
    setDays((prev) => {
      const last = prev[prev.length - 1]
      const more = Array.from({ length: DAYS_PER_PAGE }, (_, i) => addDays(last, -(i + 1)))
      return [...prev, ...more]
    })
  }

  function showOnlyToday() {
    setDays([toDateKey(new Date())])
  }

  if (loading) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  }
  if (error) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">Couldn't load your diet plan.</p>
  }
  if (!plan) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">No diet plan yet.</p>
  }

  const meals = [...plan.meals].sort((a, b) => a.order - b.order)
  const today = toDateKey(new Date())

  return (
    <div className="flex flex-col gap-3">
      {meals.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">No meals in this plan yet.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {days.map((date) => (
              <LogDayCard
                key={date}
                date={date}
                isToday={date === today}
                meals={meals}
                target={plan.average_daily_nutrients}
              />
            ))}
          </ul>
          <div className="flex justify-center gap-2">
            <Button type="button" variant="outline" onClick={loadEarlierDays}>
              Load earlier days
            </Button>
            {days.length > 1 && (
              <Button type="button" variant="ghost" onClick={showOnlyToday}>
                Only show today
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
