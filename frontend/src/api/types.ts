export type Role = 'trainer' | 'trainee'

export type GymLocation = 'home' | 'commercial' | 'outdoor' | 'none'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

export type User = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: Role
  trainer: number | null
  height_cm: string | null
  age: number | null
  starting_weight: string | null
  starting_weight_unit: WeightUnit
  meal_preferences: number[]
  meal_preferences_notes: string
  workout_days_per_week: number | null
  workout_session_minutes: number | null
  gym_location: GymLocation | null
  experience_level: ExperienceLevel | null
  injury_notes: string
  onboarding_completed: boolean
  bmi: number | null
  bmi_category: 'underweight' | 'normal' | 'overweight' | 'obese' | null
}

export type TrainerConnectionOption = 'no_preference' | 'specific_trainer' | 'train_myself'
export type TrainerConnectionStatus = 'pending_manual_assignment' | 'active' | 'not_applicable'

export type TrainerConnection = {
  id: number
  option_selected: TrainerConnectionOption
  requested_trainer_name: string
  status: TrainerConnectionStatus
  assigned_trainer: number | null
  assigned_trainer_username: string | null
  created_at: string
}

export type NewTrainerConnection = {
  option_selected: TrainerConnectionOption
  requested_trainer_name?: string
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

export type DailyMetric = {
  id: number
  trainee: number
  date: string
  weight: string | null
  weight_unit: WeightUnit
  steps: number | null
  sleep_hours: string | null
  sleep_quality: number | null
  readiness: number | null
  water_intake_ml: number | null
  notes: string
}

export type NewDailyMetric = {
  date: string
  weight: string | null
  weight_unit: WeightUnit
  steps: number | null
  sleep_hours: string | null
  sleep_quality: number | null
  readiness: number | null
  water_intake_ml: number | null
  notes: string
}

export type ActivityLogEntry = {
  id: number
  trainee: number
  date: string
  activity_type: string
  duration_minutes: number
  calories_burned: number | null
  notes: string
}

export type NewActivityLogEntry = {
  date: string
  activity_type: string
  duration_minutes: number
  calories_burned: number | null
  notes: string
}

/** Read-side rollup from GET /tracker/daily-summary/?date= - calories/macros
 * consumed (Diet logs), calories burned (ActivityLog only - WorkoutSession
 * carries no calorie field in Stage 1), net balance, and the diet plan's
 * target for a planned-vs-actual comparison (null if no plan exists yet). */
export type DailySummary = {
  date: string
  trainee: number
  consumed: Nutrients
  planned: Nutrients | null
  calories_burned: number
  net_calories: number
}

export type QAThreadStatus = 'open' | 'answered' | 'archived'

export type QAThread = {
  id: number
  trainee: number
  trainee_username: string
  subject: string
  status: QAThreadStatus
  created_at: string
  updated_at: string
}

/** trainee is omitted when a trainee opens a thread (server-set to themselves);
 * required when a trainer opens one, naming which of their trainees it's about. */
export type NewQAThread = {
  subject: string
  trainee?: number
}

export type QAMessage = {
  id: number
  thread: number
  sender: number
  sender_username: string
  sender_role: Role
  body: string
  created_at: string
}

export type NewQAMessage = {
  thread: number
  body: string
}

export type TrainerNote = {
  id: number
  trainee: number
  trainee_username: string
  body: string
  created_at: string
  read: boolean
  read_at: string | null
}

export type NewTrainerNote = {
  trainee: number
  body: string
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

// --- Progress tab (read-only aggregation over the resources above) ---

export type ProgressOverviewDay = {
  date: string
  weight_kg: number | null
  steps: number | null
  sleep_hours: number | null
  water_intake_ml: number | null
  calories_consumed: number | null
  calories_burned: number | null
  net_calories: number | null
}

export type ProgressOverviewResponse = {
  trainee: number
  start: string
  end: string
  days: ProgressOverviewDay[]
}

export type ProgressLoggedExerciseOption = {
  exercise_id: number
  exercise_name: string
  set_count: number
}

export type ProgressTrainingResponse = {
  trainee: number
  start: string
  end: string
  exercise_id: number | null
  exercise_name: string | null
  logged_exercises: ProgressLoggedExerciseOption[]
}

export type ProgressTrainingVolumeWeek = {
  week_start: string
  total_volume_kg: number
  session_count: number
}

export type ProgressTrainingVolumeResponse = {
  trainee: number
  start: string
  end: string
  weeks: ProgressTrainingVolumeWeek[]
}

export type ProgressNutritionDay = {
  date: string
  consumed: Nutrients
}

export type ProgressNutritionResponse = {
  trainee: number
  start: string
  end: string
  target: Nutrients | null
  days: ProgressNutritionDay[]
  adherence_pct: number
}

export type ProgressRecoveryDay = {
  date: string
  sleep_quality: number | null
  readiness: number | null
}

export type ProgressRecoveryResponse = {
  trainee: number
  start: string
  end: string
  days: ProgressRecoveryDay[]
}

export type ProgressConsistencyResponse = {
  trainee: number
  start: string
  end: string
  days_in_range: number
  daily_metric_pct: number
  workout_session_pct: number
  diet_log_pct: number
  current_streak_days: number
}

// --- Hamburger menu: Goals, Preferences, Reminders, Notifications ---

export type GoalType = 'weight' | 'strength'
export type GoalDirection = 'lose' | 'gain' | 'maintain'

export type Goal = {
  id: number
  trainee: number
  goal_type: GoalType
  target_weight: string | null
  target_weight_unit: WeightUnit | null
  direction: GoalDirection | null
  exercise: number | null
  target_value: string | null
  target_value_unit: WeightUnit | null
  target_date: string | null
  is_active: boolean
  created_at: string
  current_weight_kg: number | null
}

export type NewGoal = {
  goal_type: GoalType
  target_weight?: string | null
  target_weight_unit?: WeightUnit | null
  direction?: GoalDirection | null
  exercise?: number | null
  target_value?: string | null
  target_value_unit?: WeightUnit | null
  target_date?: string | null
  is_active?: boolean
}

export type UserPreference = {
  default_weight_unit: WeightUnit
}

export type ReminderType = 'weight' | 'sleep' | 'diet_log' | 'workout_log'

export type ReminderSetting = {
  id: number
  reminder_type: ReminderType
  is_enabled: boolean
  time_of_day: string
  channel_in_app: boolean
  channel_push: boolean
  channel_banner: boolean
  channel_email: boolean
}

export type NewReminderSetting = {
  reminder_type: ReminderType
  is_enabled: boolean
  time_of_day: string
  channel_in_app: boolean
  channel_push: boolean
  channel_banner: boolean
  channel_email: boolean
}

export type NotificationKind = 'reminder' | 'goal_completion'

export type AppNotification = {
  id: number
  kind: NotificationKind
  title: string
  body: string
  reminder: number | null
  goal: number | null
  is_read: boolean
  read_at: string | null
  created_at: string
}
