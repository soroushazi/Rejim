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

export type Nutrients = {
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  sugar_g: number | null
  sodium_mg: number | null
  potassium_mg: number | null
  calcium_mg: number | null
  iron_mg: number | null
  vitamin_c_mg: number | null
  vitamin_a_mcg: number | null
}

export type DietPlanSummary = {
  id: number
  trainee: number
  name: string
  created_at: string
}

export type ReferenceMealItemDetail = {
  id: number
  food_item: number
  food_item_name: string
  reference_weight_grams: string
  reference_nutrients: Nutrients
}

export type MealOptionDetail = {
  id: number
  label: string
  order: number
  items: ReferenceMealItemDetail[]
  nutrients: Nutrients
}

export type ReferenceMealDetail = {
  id: number
  label: string
  day_of_week: number | null
  order: number
  options: MealOptionDetail[]
  average_nutrients: Nutrients
}

export type DietPlanDetail = DietPlanSummary & {
  meals: ReferenceMealDetail[]
  average_daily_nutrients: Nutrients
}

export type LoggedMealSource = 'plan' | 'custom'

export type LoggedMealItem = {
  id: number
  reference_meal_item: number | null
  food_item: number | null
  food_item_name: string
  actual_weight_grams: string
  actual_nutrients: Nutrients
}

export type LoggedMeal = {
  id: number
  trainee: number
  reference_meal: number
  reference_meal_label: string
  date: string
  source: LoggedMealSource
  meal_option_label: string | null
  items: LoggedMealItem[]
  total_nutrients: Nutrients
}

export type NewLoggedMealItem =
  | { reference_meal_item: number; actual_weight_grams: string }
  | { food_item: number; actual_weight_grams: string }

export type NewLoggedMeal = {
  reference_meal: number
  date: string
  source: LoggedMealSource
  items: NewLoggedMealItem[]
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
