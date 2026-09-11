import { apiFetch } from './client'
import type { LoggedMeal, NewLoggedMeal } from './types'

export function listLoggedMeals(date: string): Promise<LoggedMeal[]> {
  return apiFetch<LoggedMeal[]>(`/nutrition/logged-meals/?date=${date}`)
}

/** Fetches every logged meal up to (and including) end, optionally bounded below by
 * start - for the Progress trend chart and history, a single bulk fetch rather than
 * one request per day. Omitting start fetches the trainee's full history. Pass
 * traineeId for a trainer viewing one of their trainees. */
export function listLoggedMealsRange(end: string, start?: string, traineeId?: number): Promise<LoggedMeal[]> {
  const params = new URLSearchParams({ end })
  if (start) params.set('start', start)
  if (traineeId) params.set('trainee_id', String(traineeId))
  return apiFetch<LoggedMeal[]>(`/nutrition/logged-meals/?${params.toString()}`)
}

export function saveLoggedMeal(data: NewLoggedMeal): Promise<LoggedMeal> {
  return apiFetch<LoggedMeal>('/nutrition/logged-meals/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function deleteLoggedMeal(id: number): Promise<void> {
  return apiFetch<void>(`/nutrition/logged-meals/${id}/`, { method: 'DELETE' })
}
