export function toDateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(dateKey: string, delta: number) {
  const d = new Date(`${dateKey}T00:00:00`)
  d.setDate(d.getDate() + delta)
  return toDateKey(d)
}

/** Monday of the current week, as a date key. */
export function startOfWeek(today: Date = new Date()) {
  const diffToMonday = (today.getDay() + 6) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - diffToMonday)
  return toDateKey(monday)
}

/** The 1st of the current month, as a date key. */
export function startOfMonth(today: Date = new Date()) {
  return toDateKey(new Date(today.getFullYear(), today.getMonth(), 1))
}
