import { apiFetch } from './client'
import type { LoggedMeal, NewLoggedMeal } from './types'

export function listLoggedMeals(date: string): Promise<LoggedMeal[]> {
  return apiFetch<LoggedMeal[]>(`/nutrition/logged-meals/?date=${date}`)
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
