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

export type MacroFilter = {
  id: number
  name: string
}

export type DietaryTag = {
  id: number
  name: string
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
  macro_filters: number[]
  dietary_tags: number[]
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
  macro_filters?: number[]
  dietary_tags?: number[]
  components?: NewFoodItemComponent[]
}

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced'

export type MuscleGroup = {
  id: number
  name: string
}

export type Exercise = {
  id: number
  name: string
  description: string
  equipment: string
  primary_muscle_groups: number[]
  secondary_muscle_groups: number[]
  difficulty_level: ExerciseDifficulty
  image: string | null
  video_url: string | null
  alternatives: number[]
}

export type WorkoutPlanSummary = {
  id: number
  trainee: number
  name: string
  sessions_per_week: number
  created_at: string
}

export type PlanExerciseDetail = {
  id: number
  exercise: number
  exercise_name: string
  target_sets: number
  target_reps_min: number
  target_reps_max: number
  default_rest_seconds: number
  order: number
  notes: string
}

export type PlanSessionDetail = {
  id: number
  label: string
  order: number
  notes: string
  exercises: PlanExerciseDetail[]
}

export type WorkoutPlanDetail = WorkoutPlanSummary & {
  sessions: PlanSessionDetail[]
}

export type WeightUnit = 'kg' | 'lb'

export type LoggedSetEntry = {
  id: number
  set_number: number
  weight: string
  weight_unit: WeightUnit
  reps_done: number
  rest_seconds: number | null
  is_warmup: boolean
  rpe: number | null
}

export type LoggedExerciseEntry = {
  id: number
  plan_exercise: number
  exercise_name: string
  order: number
  sets: LoggedSetEntry[]
}

export type WorkoutSessionLog = {
  id: number
  trainee: number
  plan_session: number
  plan_session_label: string
  date: string
  notes: string
  duration_minutes: number | null
  logged_exercises: LoggedExerciseEntry[]
}

export type NewLoggedSet = {
  set_number: number
  weight: string
  weight_unit: WeightUnit
  reps_done: number
  rest_seconds?: number | null
  is_warmup?: boolean
  rpe?: number | null
}

export type NewLoggedExercise = {
  plan_exercise: number
  sets: NewLoggedSet[]
}

export type NewWorkoutSessionLog = {
  plan_session: number
  date: string
  notes?: string
  duration_minutes?: number | null
  logged_exercises: NewLoggedExercise[]
}

/** Flat shape returned by GET /workouts/logged-sets/?exercise=<id> - one row per
 * set across every past session for that exercise, used for the history list
 * and chart (and, client-side, weight suggestions + PR detection). */
export type ExerciseHistorySet = {
  id: number
  logged_exercise: number
  set_number: number
  weight: string
  weight_unit: WeightUnit
  reps_done: number
  rest_seconds: number | null
  is_warmup: boolean
  rpe: number | null
  session_date: string
  exercise: number
}
