import { apiFetch } from './client'
import type { Goal, NewGoal } from './types'

export function listGoals(traineeId?: number): Promise<Goal[]> {
  const query = traineeId ? `?trainee_id=${traineeId}` : ''
  return apiFetch<Goal[]>(`/goals/${query}`)
}

export function createGoal(data: NewGoal): Promise<Goal> {
  return apiFetch<Goal>('/goals/', { method: 'POST', body: JSON.stringify(data) })
}

export function updateGoal(id: number, data: Partial<NewGoal>): Promise<Goal> {
  return apiFetch<Goal>(`/goals/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function deleteGoal(id: number): Promise<void> {
  return apiFetch<void>(`/goals/${id}/`, { method: 'DELETE' })
}
