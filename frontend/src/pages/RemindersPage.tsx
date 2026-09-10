import { useEffect, useState } from 'react'
import { listReminders, saveReminder } from '@/api/reminders'
import type { ReminderSetting, ReminderType } from '@/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toggle } from '@/components/ui/toggle'
import { subscribeToPush, unsubscribeFromPush } from '@/lib/push'

const REMINDER_TYPES: { type: ReminderType; label: string }[] = [
  { type: 'weight', label: 'Weight' },
  { type: 'sleep', label: 'Sleep' },
  { type: 'diet_log', label: 'Diet log' },
  { type: 'workout_log', label: 'Workout log' },
]

type RowState = {
  is_enabled: boolean
  time_of_day: string
  channel_in_app: boolean
  channel_push: boolean
  channel_banner: boolean
  channel_email: boolean
}

const DEFAULT_ROW: RowState = {
  is_enabled: false,
  time_of_day: '08:00',
  channel_in_app: true,
  channel_push: false,
  channel_banner: false,
  channel_email: false,
}

function toRowState(reminder: ReminderSetting | undefined): RowState {
  if (!reminder) return DEFAULT_ROW
  return {
    is_enabled: reminder.is_enabled,
    time_of_day: reminder.time_of_day.slice(0, 5),
    channel_in_app: reminder.channel_in_app,
    channel_push: reminder.channel_push,
    channel_banner: reminder.channel_banner,
    channel_email: reminder.channel_email,
  }
}

function ReminderRow({ type, label, initial }: { type: ReminderType; label: string; initial: RowState }) {
  const [state, setState] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function persist(next: RowState) {
    setSaving(true)
    setError(null)
    try {
      await saveReminder({ reminder_type: type, ...next })
    } catch {
      setError('Could not save.')
    } finally {
      setSaving(false)
    }
  }

  function update(next: RowState) {
    setState(next)
    persist(next)
  }

  async function togglePush(pressed: boolean) {
    if (pressed) {
      const ok = await subscribeToPush()
      if (!ok) {
        setError('Push notifications were not enabled (permission denied or unsupported browser).')
        return
      }
    } else {
      await unsubscribeFromPush()
    }
    update({ ...state, channel_push: pressed })
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{label}</CardTitle>
        <Toggle pressed={state.is_enabled} onPressedChange={(v) => update({ ...state, is_enabled: v })} size="sm">
          {state.is_enabled ? 'Enabled' : 'Disabled'}
        </Toggle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`reminder-time-${type}`}>Time</Label>
          <Input
            id={`reminder-time-${type}`}
            type="time"
            className="w-32"
            value={state.time_of_day}
            disabled={!state.is_enabled}
            onChange={(e) => update({ ...state, time_of_day: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Channels</Label>
          <div className="flex flex-wrap gap-1.5">
            <Toggle
              pressed={state.channel_in_app}
              onPressedChange={(v) => update({ ...state, channel_in_app: v })}
              disabled={!state.is_enabled}
              variant="outline"
              size="sm"
            >
              In-app
            </Toggle>
            <Toggle
              pressed={state.channel_push}
              onPressedChange={togglePush}
              disabled={!state.is_enabled}
              variant="outline"
              size="sm"
            >
              Push
            </Toggle>
            <Toggle
              pressed={state.channel_banner}
              onPressedChange={(v) => update({ ...state, channel_banner: v })}
              disabled={!state.is_enabled}
              variant="outline"
              size="sm"
            >
              Banner
            </Toggle>
            <Toggle
              pressed={state.channel_email}
              onPressedChange={(v) => update({ ...state, channel_email: v })}
              disabled={!state.is_enabled}
              variant="outline"
              size="sm"
            >
              Email
            </Toggle>
          </div>
          {/* Email toggle is shown now so this surface doesn't need rework
           * later, but delivery isn't built yet - see CLAUDE.md Future Tasks. */}
          <p className="text-xs text-muted-foreground">Email reminders are coming soon - the toggle is saved but doesn't send yet.</p>
        </div>
        {saving && <p className="text-xs text-muted-foreground">Saving…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<ReminderSetting[] | null>(null)

  useEffect(() => {
    listReminders()
      .then(setReminders)
      .catch(() => setReminders([]))
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-lg font-semibold">Reminders</h1>
      {reminders === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        REMINDER_TYPES.map(({ type, label }) => (
          <ReminderRow
            key={type}
            type={type}
            label={label}
            initial={toRowState(reminders.find((r) => r.reminder_type === type))}
          />
        ))
      )}
    </div>
  )
}
