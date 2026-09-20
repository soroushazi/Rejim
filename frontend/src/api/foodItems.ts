import { apiFetch } from './client'
import type {
  DietaryTag,
  FoodItem,
  FoodItemApprovalStatus,
  FoodItemEditRequest,
  MacroFilter,
  NewFoodItem,
  NewFoodItemEditRequest,
  Page,
} from './types'

export type FoodItemFilters = {
  search?: string
  macroFilterIds?: number[]
  dietaryTagIds?: number[]
  barcode?: string
  page?: number
  pageSize?: number
}

export function listFoodItems(filters: FoodItemFilters): Promise<Page<FoodItem>> {
  const params = new URLSearchParams()
  if (filters.search?.trim()) params.set('search', filters.search.trim())
  for (const id of filters.macroFilterIds ?? []) params.append('macro_filter', String(id))
  for (const id of filters.dietaryTagIds ?? []) params.append('dietary_tag', String(id))
  if (filters.barcode) params.set('barcode', filters.barcode)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.pageSize) params.set('page_size', String(filters.pageSize))
  const query = params.toString()
  return apiFetch<Page<FoodItem>>(`/nutrition/food-items/${query ? `?${query}` : ''}`)
}

/** Barcode is unique on FoodItem, so at most one match - see FoodItemViewSet's
 * `barcode` query param (nutrition/views.py) and normalizeBarcode (lib/barcode.ts) for
 * why the raw scanned string doesn't need pre-normalizing here (the backend does it too,
 * defensively, using the same rule). */
export async function getFoodItemByBarcode(barcode: string): Promise<FoodItem | null> {
  const page = await listFoodItems({ barcode })
  return page.results[0] ?? null
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

export function updateFoodItem(id: number, data: Omit<NewFoodItem, 'barcode'>): Promise<FoodItem> {
  return apiFetch<FoodItem>(`/nutrition/food-items/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/** Fetched in full alongside the bank (trainers see every request, trainees only
 * their own - see FoodItemEditRequestViewSet.get_queryset) and grouped client-side
 * by food item, mirroring listExerciseEditRequests. */
export function listFoodItemEditRequests(): Promise<FoodItemEditRequest[]> {
  return apiFetch<FoodItemEditRequest[]>('/nutrition/food-item-edit-requests/')
}

export function createFoodItemEditRequest(data: NewFoodItemEditRequest): Promise<FoodItemEditRequest> {
  return apiFetch<FoodItemEditRequest>('/nutrition/food-item-edit-requests/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function resolveFoodItemEditRequest(id: number): Promise<FoodItemEditRequest> {
  return apiFetch<FoodItemEditRequest>(`/nutrition/food-item-edit-requests/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'resolved' }),
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

/** Open to any authenticated user (trainer or trainee) - see
 * nutrition.views.DietaryTagViewSet. Lets someone add a diet type that isn't
 * in the seeded vocabulary yet, e.g. from the onboarding Preferences step. */
export function createDietaryTag(data: { name: string; description?: string }): Promise<DietaryTag> {
  return apiFetch<DietaryTag>('/nutrition/dietary-tags/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
