import { apiFetch } from './client'
import type { DietPlanDetail, DietPlanSummary } from './types'

export function listDietPlans(traineeId?: number): Promise<DietPlanSummary[]> {
  const query = traineeId ? `?trainee_id=${traineeId}` : ''
  return apiFetch<DietPlanSummary[]>(`/nutrition/diet-plans/${query}`)
}

/** traineeId disambiguates a dual-role account's own retrieve requests (see
 * TraineeScopedQuerysetMixin) - the trainer dashboard always has one on hand
 * and must pass it, or a trainer who is also a trainee gets scoped to their
 * own records instead of the trainee's. Self-view pages omit it. */
export function getDietPlan(id: number, traineeId?: number): Promise<DietPlanDetail> {
  const query = traineeId ? `?trainee_id=${traineeId}` : ''
  return apiFetch<DietPlanDetail>(`/nutrition/diet-plans/${id}/${query}`)
}

export function createDietPlan(data: { trainee: number; name: string }): Promise<DietPlanSummary> {
  return apiFetch<DietPlanSummary>('/nutrition/diet-plans/', { method: 'POST', body: JSON.stringify(data) })
}

export function updateDietPlan(id: number, data: { name: string }): Promise<DietPlanSummary> {
  return apiFetch<DietPlanSummary>(`/nutrition/diet-plans/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function deleteDietPlan(id: number): Promise<void> {
  return apiFetch<void>(`/nutrition/diet-plans/${id}/`, { method: 'DELETE' })
}

export type NewReferenceMeal = { diet_plan: number; label: string; day_of_week: number | null; order: number }

export function createReferenceMeal(data: NewReferenceMeal): Promise<{ id: number }> {
  return apiFetch('/nutrition/reference-meals/', { method: 'POST', body: JSON.stringify(data) })
}

export function updateReferenceMeal(id: number, data: Partial<NewReferenceMeal>): Promise<{ id: number }> {
  return apiFetch(`/nutrition/reference-meals/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function deleteReferenceMeal(id: number): Promise<void> {
  return apiFetch<void>(`/nutrition/reference-meals/${id}/`, { method: 'DELETE' })
}

export type NewMealOption = { meal: number; label: string; order: number }

export function createMealOption(data: NewMealOption): Promise<{ id: number }> {
  return apiFetch('/nutrition/meal-options/', { method: 'POST', body: JSON.stringify(data) })
}

export function updateMealOption(id: number, data: Partial<NewMealOption>): Promise<{ id: number }> {
  return apiFetch(`/nutrition/meal-options/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function deleteMealOption(id: number): Promise<void> {
  return apiFetch<void>(`/nutrition/meal-options/${id}/`, { method: 'DELETE' })
}

export type NewReferenceMealItem = { option: number; food_item: number; reference_weight_grams: string }

export function createReferenceMealItem(data: NewReferenceMealItem): Promise<{ id: number }> {
  return apiFetch('/nutrition/reference-meal-items/', { method: 'POST', body: JSON.stringify(data) })
}

export function deleteReferenceMealItem(id: number): Promise<void> {
  return apiFetch<void>(`/nutrition/reference-meal-items/${id}/`, { method: 'DELETE' })
}
