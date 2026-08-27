import { apiFetch } from './client'
import type { FoodItem, FoodItemApprovalStatus, NewFoodItem } from './types'

export function listFoodItems(search: string): Promise<FoodItem[]> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  return apiFetch<FoodItem[]>(`/nutrition/food-items/${query}`)
}

export function createFoodItem(data: NewFoodItem): Promise<FoodItem> {
  return apiFetch<FoodItem>('/nutrition/food-items/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function reviewFoodItem(id: number, approval_status: FoodItemApprovalStatus): Promise<FoodItem> {
  return apiFetch<FoodItem>(`/nutrition/food-items/${id}/review/`, {
    method: 'POST',
    body: JSON.stringify({ approval_status }),
  })
}
