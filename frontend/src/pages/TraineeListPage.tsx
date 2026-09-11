import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listTraineeRoster } from '@/api/trainerDashboard'
import type { TraineeListRow, WeightTrend } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Toggle } from '@/components/ui/toggle'

const TREND_LABEL: Record<WeightTrend, string> = { losing: 'Losing', gaining: 'Gaining', maintaining: 'Maintaining' }

function formatLastActive(value: string | null) {
  if (!value) return 'Never'
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** The trainer's home screen - a searchable/filterable roster of their
 * assigned trainees (see TRAINER_DASHBOARD_SPEC.md). */
export default function TraineeListPage() {
  const navigate = useNavigate()
  const { user, setViewMode } = useAuth()
  const [rows, setRows] = useState<TraineeListRow[] | null>(null)
  const [search, setSearch] = useState('')
  const [trend, setTrend] = useState<WeightTrend | 'any'>('any')
  const [lowConsistency, setLowConsistency] = useState(false)
  const [inactiveDays, setInactiveDays] = useState<string>('any')

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      listTraineeRoster({
        search: search.trim() || undefined,
        trend: trend === 'any' ? undefined : trend,
        lowConsistency: lowConsistency || undefined,
        inactiveDays: inactiveDays === 'any' ? undefined : Number(inactiveDays),
      })
        .then((data) => {
          if (!cancelled) setRows(data)
        })
        .catch(() => {
          if (!cancelled) setRows([])
        })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, trend, lowConsistency, inactiveDays])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">My Trainees</h1>
        {user?.is_trainer && user?.is_trainee && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground"
            onClick={() => {
              setViewMode('trainee')
              navigate('/diet')
            }}
          >
            Log my own training
          </Button>
        )}
      </div>

      <Input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="flex flex-wrap items-center gap-1.5">
        <Select value={trend} onValueChange={(v) => setTrend(v as WeightTrend | 'any')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any trend</SelectItem>
            <SelectItem value="losing">Losing</SelectItem>
            <SelectItem value="gaining">Gaining</SelectItem>
            <SelectItem value="maintaining">Maintaining</SelectItem>
          </SelectContent>
        </Select>
        <Toggle pressed={lowConsistency} onPressedChange={setLowConsistency} variant="outline" size="sm">
          Low consistency
        </Toggle>
        <Select value={inactiveDays} onValueChange={setInactiveDays}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any activity</SelectItem>
            <SelectItem value="3">Inactive 3+ days</SelectItem>
            <SelectItem value="7">Inactive 7+ days</SelectItem>
            <SelectItem value="14">Inactive 14+ days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rows === null ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">No trainees match.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <Card key={row.id} className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => navigate(`/trainees/${row.id}`)}>
              <CardContent className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-medium">
                    {row.first_name || row.last_name ? `${row.first_name} ${row.last_name}`.trim() : row.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Consistency {row.consistency_pct}% · Last active {formatLastActive(row.last_active)}
                  </span>
                </div>
                {row.weight_trend && <Badge variant="secondary">{TREND_LABEL[row.weight_trend]}</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
