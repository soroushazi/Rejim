# Data Models & Backend Roadmap

Covers the five bottom-nav sections (Trainer Connection, Diet, Exercise, Daily Tracker, Progress Dashboard) plus the core accounts layer they all depend on.

Naming below is illustrative — adjust to match Django conventions you prefer. `FK` = ForeignKey, `M2M` = ManyToManyField.

---

## 0. Accounts / Core (foundation for everything else)

Not in your original 5, but required before any of them work.

**`User`** — Django's built-in user, extended via a profile.

**`Profile`**
- `user` (OneToOne → User)
- `role` (choice: `trainee` / `trainer`)
- `date_of_birth`, `height_cm`, etc. (optional, useful for macro calculations later)

**`TrainerAssignment`**
- `trainer` (FK → User, limited to role=trainer)
- `trainee` (FK → User, limited to role=trainee)
- `active` (bool)
- `assigned_at`

*Note:* every model below that's "trainer-defined" (diet plans, workout plans) should really be created **by** a trainer **for** a trainee, or by the trainee themself if self-coached. Consider a nullable `created_by` FK on plans to distinguish self-made vs. trainer-made plans.

---

## 1. Trainer Connection

**`QAThread`**
- `trainee` (FK → User)
- `trainer` (FK → User)
- `subject` (char)
- `status` (choice: `open`, `answered`, `archived`)
- `created_at`, `updated_at`

**`QAMessage`**
- `thread` (FK → QAThread)
- `sender` (FK → User)
- `body` (text)
- `created_at`

**`TrainerNote`**
- `trainer` (FK → User)
- `trainee` (FK → User)
- `body` (text)
- `created_at`
- `read` (bool, default False) — lets the trainee see unread notes at a glance

*Idea:* add `read_at` timestamp instead of a plain bool if you want read receipts later.

---

## 2. Diet

**`FoodItem`** (the reference bank)
- `name`
- `barcode` (char, nullable, indexed, unique when present)
- `image` (nullable)
- `calories_per_100g`
- `protein_g_per_100g`, `carbs_g_per_100g`, `fat_g_per_100g`
- micronutrients: either flat fields (`sodium_mg`, `iron_mg`, etc.) or a separate `Micronutrient` + `FoodItemMicronutrient` pair if you want the list to be extensible without new migrations every time. For ~10 users, flat fields are simpler; go relational only if the micronutrient list is expected to grow a lot.
- `source` (choice: `manual`, `api`; default `manual`) — Stage 1 only ever creates `manual` entries (self-seeded), but having the field now means adding a public food API later (e.g. Open Food Facts) doesn't require a schema change, just a new value and an `external_id` field.
- `external_id` (char, nullable, blank) — reserved for a future API's product ID; unused while `source = manual`
- `created_by` (FK → User, nullable) — who seeded this entry, useful once you're not the only one adding items
- `verified` (bool, default True for manual entries) — useful once API-sourced entries exist and you want to flag ones that haven't been checked

**`QuickLogItem`** (user's own saved "my smoothie" shortcuts)
- `user` (FK → User)
- `name`
- calories/macros/**micronutrients** — same full field set as `FoodItem` (same choice of flat fields vs. relational `Micronutrient` table — keep them consistent with each other), fixed values (not scaled by weight, since it's "I had one")
- `availability` (choice: `private`, `public`; default `private`) — private items only appear in the owner's quick-log list; public items are visible to any user, e.g. in a shared/community quick-log search
- `approval_status` (choice: `not_applicable`, `pending`, `approved`, `rejected`; default `not_applicable`) — only meaningful when `availability = public`. Setting `availability` to `public` should move this to `pending`; only `approved` public items are actually visible to other users. Private items stay `not_applicable` and skip review entirely.
- `reviewed_by` (FK → User, nullable) — the admin who approved/rejected it
- `reviewed_at` (nullable)
- optionally: `composed_of` (M2M → FoodItem, through a `QuickLogItemIngredient` with amounts) if you want these built from real ingredients rather than flat numbers

*Note:* when `availability = public`, keep `user` as the original creator (for attribution) rather than nulling it out — you'll likely want "created by" shown in the UI once other people can use it.

*Enforcement:* "visible to other users" should always mean `availability = public` **and** `approval_status = approved` — enforce this in the queryset/manager (e.g. a `QuickLogItem.objects.public()` helper) rather than relying on every view to check both fields correctly.

**`DietPlan`**
- `trainee` (FK → User)
- `created_by` (FK → User, nullable — trainer or self)
- `name`
- `active` (bool)

**`DietPlanDay`**
- `plan` (FK → DietPlan)
- `day_of_week` (choice, nullable) — null/blank means "applies every day"
- covers your weekday/weekend or fixed-daily cases with one model

**`PlannedFoodEntry`**
- `plan_day` (FK → DietPlanDay)
- `food_item` (FK → FoodItem, nullable)
- `quick_log_item` (FK → QuickLogItem, nullable)
- `target_amount_g`
- `meal_label` (char, e.g. "breakfast" — optional but nice for grouping)

**`FoodLog`** (the actual log entry)
- `user` (FK → User)
- `food_item` (FK → FoodItem, nullable)
- `quick_log_item` (FK → QuickLogItem, nullable)
- `amount_g` (nullable if quick_log_item is a fixed "one serving" log)
- `logged_at` (datetime)
- `source` (choice: `barcode`, `manual`, `quick`)
- computed calories/macros/micros — compute on save (method or signal) and store as a snapshot, so historical logs don't change if you edit a `FoodItem` later

---

## 3. Exercise

**`Exercise`** (the exercise bank)
- `name`
- `description`
- `muscle_groups` (M2M → `MuscleGroup`)
- `difficulty_level` (choice: `beginner`, `intermediate`, `advanced`)
- `image` (nullable)
- `youtube_video_id_or_url` (char/URLField, nullable) — Stage 1 supports YouTube only; store either the full URL or just the video ID (ID is smaller and simpler to embed via `https://www.youtube.com/embed/{id}`, so prefer that if you're comfortable parsing it on save)
- `alternatives` (M2M → self)

**`MuscleGroup`**
- `name` (e.g. "quadriceps", "lats")

**`WorkoutPlan`**
- `trainee` (FK → User)
- `created_by` (FK → User, nullable)
- `name`, `active`

**`WorkoutPlanDay`**
- `plan` (FK → WorkoutPlan)
- `day_of_week` (choice, nullable, same pattern as diet)
- `label` (char, e.g. "Push Day")

**`PlannedExercise`**
- `plan_day` (FK → WorkoutPlanDay)
- `exercise` (FK → Exercise)
- `target_sets`, `target_reps`
- `order` (int, for display sequence)

**`WorkoutSession`** (a logged gym visit)
- `user` (FK → User)
- `plan_day` (FK → WorkoutPlanDay, nullable — session may deviate from plan)
- `date`

**`LoggedExercise`**
- `session` (FK → WorkoutSession)
- `exercise` (FK → Exercise)
- `order`

**`LoggedSet`**
- `logged_exercise` (FK → LoggedExercise)
- `set_number`
- `reps`
- `weight` (decimal, nullable — not in your original spec but nearly free to add and needed for real progress tracking)
- `weight_unit` (choice: `kg`, `lb`; default `kg`) — store exactly what the user entered rather than force-converting, so old logs don't silently change if you switch a display preference later. Convert to a single unit only at the API/frontend layer when charting progress across mixed-unit logs.

**Progress ("how strong/weak am I getting"):**
No new table needed for Stage 1 — this is a query: filter `LoggedSet` by `exercise` or by `exercise__muscle_groups`, group by date, chart max weight / est. 1RM / volume over time. If this gets slow at scale, add a materialized `ExerciseProgressSnapshot` (user, exercise, week, best_weight, total_volume) later — not now.

---

## 4. Daily Tracker

**`DailyMetric`** (one row per user per day)
- `user` (FK → User)
- `date`
- `weight` (decimal, nullable)
- `weight_unit` (choice: `kg`, `lb`; default `kg`) — same pattern as `LoggedSet.weight_unit`
- `steps` (nullable)
- `sleep_hours` (nullable, decimal)

**`ActivityLog`** (separate from DailyMetric since multiple can occur per day)
- `user` (FK → User)
- `date`
- `activity_type` (char or FK to a small lookup table — "volleyball", "tennis", etc.)
- `duration_minutes`

**`ProgressPhoto`**
- `user` (FK → User)
- `date` (photos can be taken anytime, not restricted to a fixed daily moment)
- `image`
- `label` (choice: `after_waking_up`, `after_workout`, `other`; no hard default at the model level)
- `note` (nullable)
- `workout_session` (FK → WorkoutSession, nullable) — set when taken from the workout tab, useful for linking the photo to that specific session later

**Default `label` is a view-layer decision, not a model default:** the same field needs a different default depending on where the photo was taken —
- Taken from the **Workout tab** → default `label = after_workout`, and set `workout_session` to the current/most recent session
- Taken from the **Tracker tab** → default `label = after_waking_up`, `workout_session` left null

Either way the user can override the label before saving. Implement this as two thin API entry points (or one endpoint with a `source` param) that just pre-fill different defaults — the underlying model and table stay the same.

---

## 5. Progress Dashboard

No new persisted model — this is a read/aggregation layer over everything above:
- Pull `DailyMetric` (weight, steps, sleep) by date range
- Pull `WorkoutSession` dates to mark training days
- Pull `ProgressPhoto` by date for the click-to-view interaction
- Return as a single time-series payload the frontend can toggle attributes on/off from

Build this as a dedicated API endpoint (e.g. `/api/dashboard/?start=...&end=...`) that joins the above rather than a model.

---

## Suggested Backend Roadmap

Ordered by dependency, not necessarily by which feature ships to users first — adjust ordering if you want something demoable earlier.

1. **Accounts & roles** — `User`, `Profile`, `TrainerAssignment`. Nothing else works without knowing who's a trainer/trainee and who's paired with whom.
2. **Exercise bank + workout plan + workout log** — `MuscleGroup`, `Exercise`, `WorkoutPlan`/`Day`, `PlannedExercise`, `WorkoutSession`, `LoggedExercise`, `LoggedSet`.
3. **Food bank + diet plan + food log** — `FoodItem`, `QuickLogItem`, `DietPlan`/`Day`, `PlannedFoodEntry`, `FoodLog`. Decide barcode data source here (public API vs. self-seeded) before building the scan flow.
4. **Daily tracker** — `DailyMetric`, `ActivityLog`, `ProgressPhoto`.
5. **Trainer connection** — `QAThread`, `QAMessage`, `TrainerNote`. Comes after roles/assignment exist (step 1) but is otherwise independent of diet/exercise, so it can slot in anytime.
6. **Progress dashboard API** — last, since it aggregates everything from steps 2–4.

Within each step: models → migrations → DRF serializers/viewsets → basic admin registration (handy for seeding the exercise/food banks manually before a real admin UI exists) → then move to that step's frontend page.

---

## Decisions Made (Stage 1)

- **Barcode/food data:** self-seeded `FoodItem` bank only for now. `source`/`external_id` fields are in place so a public API can be added later without a schema change.
- **Exercise video:** YouTube only.
- **`day_of_week = null`:** means "applies every day" — no separate boolean.
- **Weight units:** `LoggedSet` and `DailyMetric` both store a `weight` + `weight_unit` (`kg`/`lb`) pair, preserving whatever unit the user entered in.
- **`QuickLogItem` sharing:** `availability` field, `private` (default) or `public`. `QuickLogItem` carries the same full micronutrient field set as `FoodItem` — no lighter-weight version for quick entries.
- **Public `QuickLogItem` moderation:** requires admin approval. `approval_status` (`pending`/`approved`/`rejected`) gates visibility separately from `availability`; only `public` + `approved` items are visible to other users. Review via Django admin is sufficient for Stage 1 — no dedicated moderation UI needed yet.
- **Progress photos:** freeform, any time. `label` defaults to `after_workout` when logged from the Workout tab and `after_waking_up` when logged from the Tracker tab, but the default is applied at the API/view layer, not baked into the model.
- **Implementation naming:** the backend build kept the existing model names already in the codebase (`PlanDay`, `ReferenceMeal`, `PlanExercise`, `FoodLog`, ...) rather than renaming to this doc's illustrative names (`WorkoutPlanDay`, `DietPlanDay`, `PlannedExercise`, `PlannedFoodEntry`, ...) — same shapes/relationships as described above, different labels. Trainer connection and daily tracker each landed in their own new app (`connection`, `tracker`) rather than folding into `accounts`.
- **`QuickLogItem` sharing:** built **private-only** for Stage 1 — no `availability`/`approval_status`/`reviewed_by` fields yet. The public/moderated version described above is deferred (tracked in `CLAUDE.md` under "Deferred" so it isn't lost).
- **`ProgressPhoto`:** deferred, not built. Also tracked in `CLAUDE.md` under "Deferred."

## Still Open

Everything in this document is now implemented except the two items explicitly deferred above (public/moderated `QuickLogItem` sharing, and `ProgressPhoto`) — see `CLAUDE.md` for the up-to-date implementation notes and the deferred-work list.
