/** DRF's PageNumberPagination response shape - only FoodItemViewSet paginates today
 * (see FoodItemPagination on the backend), everything else is small enough to fetch
 * in full. */
export type Page<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type GymLocation = 'home' | 'commercial' | 'outdoor' | 'none'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'
export type Sex = 'male' | 'female' | 'unspecified'

export type User = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_trainee: boolean
  is_trainer: boolean
  trainer: number | null
  height_cm: string | null
  age: number | null
  sex: Sex
  starting_weight: string | null
  starting_weight_unit: WeightUnit
  /** Latest DailyMetric weight if logged, else starting_weight - see
   * accounts/services.py::resolve_current_weight_kg. Null if neither exists. */
  current_weight_kg: number | null
  /** The account's own display-unit preference (kg/lb) - see usersettings.models
   * UserPreference. Exposed on User (not just /preferences/) so a trainer
   * viewing a trainee's Progress data can display weights in *their*
   * preference rather than the trainer's own. */
  default_weight_unit: WeightUnit
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
export type FoodItemVisibility = 'private' | 'public' | 'trainees'
export type FoodItemApprovalStatus = 'pending' | 'approved' | 'rejected'

export type FoodItemComponent = {
  id: number
  ingredient: number
  ingredient_name: string
  weight_grams: string
}

/** A named, food-specific unit this item can be logged in (e.g. "tbsp", "whole
 * (thigh)"), in addition to the universal g/oz/lb weight units every item supports.
 * At most one measure per item is is_default - see lib/servingUnits.ts. */
export type FoodItemMeasure = {
  id: number
  label: string
  grams_per_unit: string
  is_default: boolean
}

export type NewFoodItemMeasure = {
  label: string
  grams_per_unit: string
  is_default: boolean
}

export type MacroFilter = {
  id: number
  name: string
}

export type DietaryTag = {
  id: number
  name: string
  description: string
}

export type FoodItem = {
  id: number
  name: string
  brand_name: string | null
  barcode: string | null
  source: 'seeded' | 'off' | 'usda'
  kind: FoodItemKind
  measures: FoodItemMeasure[]
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
  food_item_measures: FoodItemMeasure[]
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

export type LoggedMealSource = 'plan' | 'custom' | 'mixed'

export type LoggedMealItem = {
  id: number
  reference_meal_item: number | null
  food_item: number | null
  quick_log_item: number | null
  food_item_name: string
  actual_weight_grams: string | null
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

/** `source` is intentionally absent - the backend derives the meal's overall
 * source from the mix of item types (LoggedMealSerializer._upsert), since a
 * single log can now freely combine plan, food-bank, and quick-log items. */
export type NewLoggedMealItem =
  | { reference_meal_item: number; actual_weight_grams: string }
  | { food_item: number; actual_weight_grams: string }
  | { quick_log_item: number }

export type NewLoggedMeal = {
  reference_meal: number
  date: string
  items: NewLoggedMealItem[]
}

/** A trainee's own saved shortcut (e.g. "my protein shake") with fixed
 * per-serving nutrition values - not scaled by weight, see backend
 * nutrition/models.py::QuickLogItem. Private to the owner. */
export type QuickLogItem = {
  id: number
  name: string
  calories: string
  protein_g: string | null
  carbs_g: string | null
  fat_g: string | null
  fiber_g: string | null
  sugar_g: string | null
  sodium_mg: string | null
  created_at: string
}

export type NewQuickLogItem = {
  name: string
  calories: string
  protein_g?: string | null
  carbs_g?: string | null
  fat_g?: string | null
  fiber_g?: string | null
  sugar_g?: string | null
  sodium_mg?: string | null
}

export type NewFoodItemComponent = {
  ingredient: number
  weight_grams: string
}

export type NewFoodItem = {
  name: string
  barcode: string | null
  kind: FoodItemKind
  visibility: FoodItemVisibility
  measures?: NewFoodItemMeasure[]
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
  /** Done one side at a time (e.g. Single-Arm Dumbbell Row) - logging
   * captures weight/reps/RPE separately per side instead of one combined
   * value (see LoggedSetEntry's own _left/_right fields). */
  is_unilateral: boolean
  image: string | null
  video_url: string | null
  alternatives: number[]
}

export type NewExercise = {
  name: string
  description: string
  equipment: string
  primary_muscle_groups: number[]
  secondary_muscle_groups: number[]
  difficulty_level: ExerciseDifficulty
  is_unilateral: boolean
  video_url: string | null
}

export type EditRequestStatus = 'pending' | 'resolved'

export type ExerciseEditRequest = {
  id: number
  exercise: number
  exercise_name: string
  requested_by: number
  requested_by_username: string
  description: string
  status: EditRequestStatus
  created_at: string
}

export type NewExerciseEditRequest = {
  exercise: number
  description: string
}

export type FoodItemEditRequest = {
  id: number
  food_item: number
  food_item_name: string
  requested_by: number
  requested_by_username: string
  description: string
  status: EditRequestStatus
  created_at: string
}

export type NewFoodItemEditRequest = {
  food_item: number
  description: string
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
  /** Superset pairing - always mirrored on both sides, pairs only (not
   * trisets+). Null when this exercise isn't part of a superset. */
  superset_with: number | null
  superset_with_exercise_name: string | null
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
  /** Bilateral shape - null for a per-side (Exercise.is_unilateral) exercise,
   * which uses the _left/_right pair below instead. Exactly one shape is
   * ever populated for a given set. */
  weight: string | null
  weight_unit: WeightUnit
  reps_done: number | null
  weight_left: string | null
  weight_right: string | null
  reps_done_left: number | null
  reps_done_right: number | null
  rest_seconds: number | null
  is_warmup: boolean
  rpe: number | null
  rpe_left: number | null
  rpe_right: number | null
}

export type LoggedExerciseEntry = {
  id: number
  plan_exercise: number
  /** Reflects an off-program substitution when one was logged (see
   * substituted_exercise) - always the exercise actually performed. */
  exercise_name: string
  /** Off-program swap: the trainee did this exercise instead of the plan's
   * own, keeping the plan's target sets/reps/rest. Null = logged as planned. */
  substituted_exercise: number | null
  /** Per-log superset override (a plan_exercise id in this same session) -
   * independent of the plan's own PlanExercise.superset_with default. Null =
   * not paired for this log. */
  superset_partner: number | null
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
  weight_unit: WeightUnit
  /** Send either weight+reps_done (bilateral) or all four _left/_right
   * fields (a per-side exercise) - never both, see LoggedSetEntry. */
  weight?: string
  reps_done?: number
  weight_left?: string
  weight_right?: string
  reps_done_left?: number
  reps_done_right?: number
  rest_seconds?: number | null
  is_warmup?: boolean
  rpe?: number | null
  rpe_left?: number | null
  rpe_right?: number | null
}

export type NewLoggedExercise = {
  plan_exercise: number
  substituted_exercise?: number | null
  superset_partner?: number | null
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
 * consumed (Diet logs), calories burned (an estimated TDEE from the
 * trainee's body stats, plus logged workouts and ActivityLog entries - see
 * tracker/services.py::estimate_calories_out), net balance, and the diet
 * plan's target for a planned-vs-actual comparison (null if no plan exists
 * yet). */
export type DailySummary = {
  date: string
  trainee: number
  consumed: Nutrients
  planned: Nutrients | null
  calories_burned: number
  calories_burned_breakdown: CaloriesBurnedBreakdown
  net_calories: number
}

export type CaloriesBurnedBreakdown = {
  /** Basal metabolic rate (Mifflin-St Jeor), or null if the trainee's
   * profile lacks height/age/a resolvable weight. */
  bmr: number | null
  /** Multiplier applied to bmr, picked from that day's step count. */
  activity_multiplier: number
  /** bmr x activity_multiplier, or null when bmr is null. */
  tdee: number | null
  workout_calories: number
  activity_calories: number
  total: number
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
  sender_role: 'trainer' | 'trainee'
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
  archived: boolean
}

export type NewTrainerNote = {
  trainee: number
  body: string
}

/** Backs the trainee's Trainer-tab bottom-nav badge and the Notes/Q&A pill
 * counts in TrainerLayout - see connection.views.UnreadSummaryView. */
export type UnreadSummary = {
  notes_unread: number
  qa_unread: number
}

/** Flat shape returned by GET /workouts/logged-sets/?exercise=<id> - one row per
 * set across every past session for that exercise, used for the history list
 * and chart (and, client-side, weight suggestions + PR detection). weight/
 * reps_done are null for a per-side (Exercise.is_unilateral) exercise's sets,
 * which use the _left/_right pair instead - weight-suggestion/PR-detection
 * don't yet support per-side data, so callers should treat a null weight as
 * "skip this row" rather than coercing it. */
export type ExerciseHistorySet = {
  id: number
  logged_exercise: number
  set_number: number
  weight: string | null
  weight_unit: WeightUnit
  reps_done: number | null
  weight_left: string | null
  weight_right: string | null
  reps_done_left: number | null
  reps_done_right: number | null
  rest_seconds: number | null
  is_warmup: boolean
  rpe: number | null
  rpe_left: number | null
  rpe_right: number | null
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
  /** Only set (and only honored) when the requester is a trainer creating a
   * goal for one of their trainees - server-forced for a trainee-requester. */
  trainee?: number
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

// --- Trainer Dashboard ---

export type WeightTrend = 'losing' | 'gaining' | 'maintaining'

export type TraineeListRow = {
  id: number
  username: string
  first_name: string
  last_name: string
  weight_trend: WeightTrend | null
  consistency_pct: number
  last_active: string | null
}

export type TraineeListFilters = {
  search?: string
  trend?: WeightTrend
  lowConsistency?: boolean
  inactiveDays?: number
}

export type TrainerPrivateNote = {
  id: number
  trainee: number
  trainee_username: string
  content: string
  created_at: string
}

export type NewTrainerPrivateNote = {
  trainee: number
  content: string
}

export type PlanChangeLogEntry = {
  id: number
  trainee: number
  changed_by: number | null
  changed_by_username: string | null
  plan_type: 'diet' | 'workout'
  summary: string
  created_at: string
}
