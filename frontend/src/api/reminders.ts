import { apiFetch } from './client'
import type { NewReminderSetting, ReminderSetting } from './types'

export function listReminders(): Promise<ReminderSetting[]> {
  return apiFetch<ReminderSetting[]>('/reminders/')
}

/** POST upserts on (user, reminder_type) server-side - always send the
 * complete current state for that reminder type, same convention as
 * saveDailyMetric. */
export function saveReminder(data: NewReminderSetting): Promise<ReminderSetting> {
  return apiFetch<ReminderSetting>('/reminders/', { method: 'POST', body: JSON.stringify(data) })
}
