export type Role = 'trainer' | 'trainee'

export type User = {
  id: number
  username: string
  email: string
  role: Role
  trainer: number | null
}

export type FoodItemKind = 'single' | 'composite'
export type FoodItemVisibility = 'private' | 'public'
export type FoodItemApprovalStatus = 'pending' | 'approved' | 'rejected'
export type FoodItemServingUnit = 'g' | 'cup' | 'oz' | 'lb' | 'each' | 'serving'

export type FoodItemComponent = {
  id: number
  ingredient: number
  ingredient_name: string
  weight_grams: string
}

export type FoodItem = {
  id: number
  name: string
  barcode: string | null
  source: 'seeded' | 'off'
  kind: FoodItemKind
  serving_unit: FoodItemServingUnit
  serving_size_grams: string | null
  calories_per_100g: string
  protein_g_per_100g: string
  carbs_g_per_100g: string
  fat_g_per_100g: string
  fiber_g_per_100g: string | null
  sugar_g_per_100g: string | null
  sodium_mg_per_100g: string | null
  potassium_mg_per_100g: string | null
  calcium_mg_per_100g: string | null
  iron_mg_per_100g: string | null
  vitamin_c_mg_per_100g: string | null
  vitamin_a_mcg_per_100g: string | null
  visibility: FoodItemVisibility
  approval_status: FoodItemApprovalStatus
  created_by: number | null
  created_by_username: string | null
  components: FoodItemComponent[]
}

export type NewFoodItemComponent = {
  ingredient: number
  weight_grams: string
}

export type NewFoodItem = {
  name: string
  barcode: null
  kind: FoodItemKind
  visibility: FoodItemVisibility
  serving_unit: FoodItemServingUnit
  serving_size_grams?: string | null
  calories_per_100g?: string | null
  protein_g_per_100g?: string | null
  carbs_g_per_100g?: string | null
  fat_g_per_100g?: string | null
  fiber_g_per_100g?: string | null
  sugar_g_per_100g?: string | null
  sodium_mg_per_100g?: string | null
  potassium_mg_per_100g?: string | null
  calcium_mg_per_100g?: string | null
  iron_mg_per_100g?: string | null
  vitamin_c_mg_per_100g?: string | null
  vitamin_a_mcg_per_100g?: string | null
  components?: NewFoodItemComponent[]
}
