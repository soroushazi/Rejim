import { apiFetch } from './client'
import type { DietPlanDetail, DietPlanSummary } from './types'

export function listDietPlans(): Promise<DietPlanSummary[]> {
  return apiFetch<DietPlanSummary[]>('/nutrition/diet-plans/')
}

export function getDietPlan(id: number): Promise<DietPlanDetail> {
  return apiFetch<DietPlanDetail>(`/nutrition/diet-plans/${id}/`)
}
