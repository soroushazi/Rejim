import { useState } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toDateKey } from '@/lib/date'
import ActivityLogSection from './daily/ActivityLogSection'
import DailyDateNav from './daily/DailyDateNav'
import DailyMetricForm from './daily/DailyMetricForm'
import DailySummaryCard from './daily/DailySummaryCard'

export default function TrackerPage() {
  const { user } = useAuth()
  const canLog = user?.role === 'trainee'
  const [date, setDate] = useState(() => toDateKey(new Date()))
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0)

  return (
    <div className="flex flex-col gap-3">
      <DailyDateNav date={date} onChange={setDate} />

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <DailySummaryCard date={date} refreshKey={summaryRefreshKey} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <DailyMetricForm date={date} canLog={canLog} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityLogSection date={date} canLog={canLog} onChange={() => setSummaryRefreshKey((k) => k + 1)} />
        </CardContent>
      </Card>
    </div>
  )
}
