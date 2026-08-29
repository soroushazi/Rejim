import { apiFetch } from './client'
import type { DietaryTag, FoodItem, FoodItemApprovalStatus, MacroFilter, NewFoodItem } from './types'

export type FoodItemFilters = {
  search?: string
  macroFilterIds?: number[]
  dietaryTagIds?: number[]
}

export function listFoodItems(filters: FoodItemFilters): Promise<FoodItem[]> {
  const params = new URLSearchParams()
  if (filters.search?.trim()) params.set('search', filters.search.trim())
  for (const id of filters.macroFilterIds ?? []) params.append('macro_filter', String(id))
  for (const id of filters.dietaryTagIds ?? []) params.append('dietary_tag', String(id))
  const query = params.toString()
  return apiFetch<FoodItem[]>(`/nutrition/food-items/${query ? `?${query}` : ''}`)
}

export function getFoodItem(id: number): Promise<FoodItem> {
  return apiFetch<FoodItem>(`/nutrition/food-items/${id}/`)
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

/** Other FoodItems that could substitute for this one - same macro role, ranked by
 * how close their calories are. See FoodItemViewSet.alternatives on the backend. */
export function listFoodItemAlternatives(id: number): Promise<FoodItem[]> {
  return apiFetch<FoodItem[]>(`/nutrition/food-items/${id}/alternatives/`)
}

export function listMacroFilters(): Promise<MacroFilter[]> {
  return apiFetch<MacroFilter[]>('/nutrition/macro-filters/')
}

export function listDietaryTags(): Promise<DietaryTag[]> {
  return apiFetch<DietaryTag[]>('/nutrition/dietary-tags/')
}
