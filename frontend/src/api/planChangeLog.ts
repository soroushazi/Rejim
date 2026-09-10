import { apiFetch } from './client'
import type { PlanChangeLogEntry } from './types'

export function listPlanChangeLog(traineeId: number, planType: 'diet' | 'workout'): Promise<PlanChangeLogEntry[]> {
  return apiFetch<PlanChangeLogEntry[]>(`/connection/plan-change-log/?trainee_id=${traineeId}&plan_type=${planType}`)
}
