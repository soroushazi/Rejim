# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

An application for tracking workouts and diet, built around a **trainer/trainee** relationship: one trainer authors fixed workout and diet plans for each of their trainees, and trainees log their actual sessions/food against those plans. Stage 1 is intentionally minimal: get core logging working end-to-end for a small group of users (~10) before adding scale, polish, or advanced features.

**Do not over-engineer.** Avoid speculative abstractions, premature microservices, multi-tenant complexity, or infrastructure aimed at scale we don't need yet. Favor the simplest Django/React implementation that correctly models the data below. Scalability is a *future* concern — note it in comments/TODOs if relevant, but don't build for it now.

## Tech Stack

- **Backend:** Django (+ Django REST Framework for the API)
- **Frontend:** React (web app)
- **Database:** Postgres preferred if available; SQLite is acceptable for Stage 1 local dev
- **Auth:** Simple session or token auth is sufficient for ~10 users — no need for complex SSO/OAuth infra. Both trainers and trainees have their own accounts.

When scaffolding, prefer Django's conventional project layout (`manage.py`, one `config`/project settings app, feature apps like `workouts`, `nutrition`, `accounts`) and Create React App/Vite defaults for the frontend, unless the repo already has an established structure — check first.

## Users: Trainers and Trainees

- A trainer can have multiple trainees; a trainee belongs to exactly one trainer. This is a simple one-to-many relationship — model it as a FK from trainee to trainer (`Trainee.trainer`), no join table needed.
- Both trainers and trainees log in and use the app themselves. Trainers author plans and review trainee progress/adherence; trainees log their own workout sessions and food intake.
- Workout and diet plans are **fixed and defined by the trainer** — trainees log actuals against them, they don't edit the plan itself.

## Core Features (Stage 1 scope)

### 1. Workout Tracking

- Trainer defines a **workout plan** for a trainee: a fixed set of days per week (2, 3, 4, etc.), each day (`PlanDay`) listing planned exercises (`PlanExercise`) with target sets, target reps, and a default rest time (e.g. 120s, editable).
- Trainee logs a **workout session** by picking which `PlanDay` they're doing — the app pre-fills the prescribed exercises/sets/reps as a template to log actuals against.
- Logging granularity is **per set**: for each exercise, log the weight used and the reps actually done in each individual set (e.g. dumbbell chest press, 3x12 prescribed → log weight + reps done for set 1, set 2, set 3 separately). Rest time actually taken is also logged per set (defaults to the plan's recommended rest, but editable).
- Core models: `WorkoutPlan` (trainee FK) → `PlanDay` (plan FK, label/order) → `PlanExercise` (day FK, exercise, target_sets, target_reps, default_rest_seconds) → `WorkoutSession` (trainee FK, plan_day FK, date) → `LoggedExercise` (session FK, plan_exercise FK) → `LoggedSet` (logged_exercise FK, set_number, weight, reps_done, rest_seconds).

### 2. Diet Tracking

- Trainer defines a **diet plan** for a trainee as a **reference meal plan**: meals (e.g. Breakfast, Lunch, Dinner) each containing reference ingredients with reference weights (e.g. "150g chicken breast").
- A **reference document/database** of ingredients and products (`FoodItem`) storing nutrition info per 100g (calories, macros, micros where available).
  - Stage 1: self-seeded reference table, built from whatever ingredients appear in trainers' reference meal plans.
  - Later stage: integrate a public food/barcode API (e.g. Open Food Facts) as an additional/alternative source for `FoodItem` data — same shape, so this is a swap-in, not a redesign.
- Trainee logs actual food intake **against a specific reference meal item** (e.g. "Breakfast → chicken breast") and enters the **actual weight they measured** — this is expected to differ from the reference weight (they're weighing it themselves, not aiming for exact precision).
- App **calculates**, from the actual weight logged: calories, macronutrients (protein, carbs, fat), and micronutrients (where data is available) — computed from the actual weight, not the reference weight. This gives an easy planned-vs-actual comparison for adherence tracking.
- Core models: `DietPlan` (trainee FK) → `ReferenceMeal` (diet_plan FK, label/order, optional `day_of_week`) → `ReferenceMealItem` (meal FK, food_item FK, reference_weight_grams) → `FoodItem` (name, barcode nullable, per-100g nutrition, source: seeded/off) → `FoodLog` (trainee FK, one of `reference_meal_item`/`food_item`/`quick_log_item`, actual_weight_grams, logged_at, snapshot nutrients).
- A trainee can also log food that isn't tied to any plan: directly against a `FoodItem` (barcode/manual search) or against their own private `QuickLogItem` shortcut (e.g. "my smoothie") — see `QuickLogItem` below.

### 3. Trainer Connection

- Trainee ↔ trainer Q&A: a `QAThread` (trainee-opened, subject + status `open`/`answered`/`archived`) containing a back-and-forth of `QAMessage`s from either party. Either party can post messages; either can change the thread's status; only a trainee can open a new thread.
- Trainer notes: a one-way `TrainerNote` (trainer-authored, trainee-read-only) with a `read`/`read_at` flag the trainee sets via a `mark_read` action — e.g. "remember to focus on form" or "good job this week."

### 4. Exercise Bank

- A shared reference bank of exercises (`Exercise`, writable by any trainer, browsable by all trainees — same access pattern as `FoodItem`): name, description, `muscle_groups` (M2M `MuscleGroup`), `difficulty_level` (beginner/intermediate/advanced), optional `image`, optional `video_url` (YouTube only, stored as-is), and `alternatives` (self M2M) for swapping out a movement.
- `PlanExercise` (workout plans) references `Exercise` by FK rather than a freeform name, so plans are built from the bank.

### 5. Daily Tracker

- `DailyMetric`: one row per trainee per day — weight (+ unit), steps, sleep hours.
- `ActivityLog`: freeform activity type (e.g. "volleyball", "tennis") + duration, multiple per day allowed.
- A read-only dashboard endpoint aggregates `DailyMetric` and `WorkoutSession` dates over a date range for a trainee (or, for a trainer, one of their trainees).

## Conventions

- Keep API endpoints RESTful and resource-oriented (e.g. `/api/workouts/sessions/`, `/api/nutrition/food-items/`, `/api/nutrition/logs/`).
- Nutrient math (scaling per-100g values by consumed weight) belongs in a model method or a small service/util function, not duplicated in views or serializers.
- Write migrations for every model change; don't hand-edit migration files.
- Prefer Django REST Framework serializers + viewsets over hand-rolled views unless there's a good reason not to.
- Keep frontend components small and feature-scoped (`WorkoutLogger`, `FoodLogEntry`, etc.) rather than one large page component.
- No auth/infra complexity beyond what ~10 users need — flag it if a request seems to be scope creep for this stage.

## Build Order (Stage 1)

1. ✅ Scaffold Django project (`config` + `accounts`, `workouts`, `nutrition` apps); custom `User`/role model with trainer/trainee distinction and `Trainee.trainer` FK.
2. ✅ `workouts` models + migrations.
3. ✅ `nutrition` models + migrations, including the nutrient-scaling util (per-100g × actual weight).
4. ✅ Seed script/fixtures for a handful of `FoodItem`s (self-seeded reference table).
5. ✅ DRF serializers + viewsets + URLs for all of the above.
6. ✅ Extend the backend: trainer connection (`connection` app), exercise bank + day-of-week plans (`workouts`), flexible food logging + `QuickLogItem` (`nutrition`), daily tracker + dashboard (`tracker` app). See "Backend implementation notes" above.
7. ⏳ **Next up.** Scaffold React (Vite) frontend + auth (login, role-aware routing for trainer vs. trainee). Open decisions to confirm with the user before/while starting: JS vs. TypeScript for the frontend (not yet decided); how the dev frontend talks to the Django API — Vite dev-server proxy to `localhost:8000` (avoids CORS entirely, simplest for Stage 1) vs. `django-cors-headers` (not yet installed); where the auth token gets stored client-side (e.g. localStorage) and how the axios/fetch client attaches it.
8. Trainer UI: build workout plan, build diet plan (reference meals), browse/manage the exercise bank, reply to Q&A threads, write trainee notes.
9. Trainee UI: `WorkoutLogger` (pick day → log sets), `FoodLogEntry` (pick meal slot → enter weight → see computed macros, or log via barcode/quick-add), Q&A + notes inbox, daily tracker entry.
10. Trainee/trainer views: session history, adherence view (planned vs. actual), progress dashboard (weight/steps/sleep/training days over time).
11. End-to-end smoke test with a trainer + a couple of trainees, covering all five nav sections.

### Backend implementation notes (steps 1-5, done)

- Django project lives in `backend/` (not repo root): `backend/manage.py`, `backend/config/` (settings/urls), `backend/accounts/`, `backend/workouts/`, `backend/nutrition/`. Virtualenv at `backend/.venv/` (gitignored) — run tooling via `backend/.venv/bin/python manage.py ...` (activation doesn't persist across separate tool calls in this environment).
- `accounts.User` extends `AbstractUser` with `role` (`trainer`/`trainee`) and a self-referential `trainer` FK (`related_name="trainees"`, `limit_choices_to={"role": "trainer"}`). `AUTH_USER_MODEL = "accounts.User"`.
- DRF installed with `SessionAuthentication` + `TokenAuthentication` (`rest_framework.authtoken`), default permission `IsAuthenticated`. Token endpoint: `POST /api/auth/token/`.
- Full model set from the sections above is implemented as designed, with `PROTECT` on `FoodItem`/`ReferenceMealItem` FKs so historical logs can't be silently cascade-deleted.
- Nutrient scaling util: `nutrition/services.py::scale_nutrients(food_item, weight_grams)` — coerces values through `Decimal(str(...))` (raw floats assigned to `DecimalField`s aren't auto-cast and will blow up multiplication otherwise). Exposed via `FoodItem.nutrients_for_weight()`, `ReferenceMealItem.reference_nutrients()`, `FoodLog.actual_nutrients()`.
- Seed command: `python manage.py seed_food_items` (idempotent, `update_or_create` by name) — seeds ~20 common ingredients in `nutrition/management/commands/seed_food_items.py`.
- API is fully wired under `/api/`: `accounts/`, `workouts/`, `nutrition/` (see each app's `urls.py`/`views.py` for the exact resource list — matches the RESTful convention above).
- Access control (reused across all viewsets, not duplicated per-resource):
  - `accounts/permissions.py`: `IsTrainerWriteTraineeReadOnly` (plan-authoring resources) and `IsTraineeWriteTrainerReadOnly` (session/log resources) — both permit safe methods for either role and restrict writes to the appropriate role.
  - `accounts/mixins.py`: `TraineeScopedQuerysetMixin` — set `trainee_path` per viewset (e.g. `"trainee"`, `"session__trainee"`, `"day__plan__trainee"`) and it scopes the queryset to the trainer's own trainees or the trainee's own records.
  - Every writable FK field on every serializer has its `queryset` restricted in `__init__` to what the requesting user may reference (prevents IDOR — e.g. a trainee can't attach a logged set to someone else's session by guessing its ID). `trainee` on session/log serializers is server-set (`perform_create`), never trusted client input.
- Verified end-to-end with an `APIClient`-based smoke test (trainer builds a full plan → trainee logs a session set-by-set; diet plan → food log with computed nutrients; cross-trainer isolation and IDOR attempts correctly rejected). Not committed as an automated test file — was a throwaway script, cleaned up after.

### Backend implementation notes (trainer connection, exercise bank, diet flexibility, daily tracker — done)

- Two new apps: `connection` (trainer↔trainee Q&A + notes) and `tracker` (daily metrics/activity log/dashboard), both under `/api/connection/` and `/api/tracker/`. Exercise bank (`Exercise`, `MuscleGroup`) extends `workouts`; `QuickLogItem` + `FoodLog` rework extend `nutrition`. Existing model names were kept (`PlanDay`, `ReferenceMeal`, `PlanExercise`, `FoodLog`, ...) rather than renamed to match `DATA_MODELS_AND_ROADMAP.md`'s illustrative names, to minimize churn.
- `PlanExercise.name` (freeform text) was replaced with `PlanExercise.exercise` (FK → `Exercise`, `PROTECT`) — a breaking field change, applied cleanly since the dev DB had zero `PlanExercise` rows at the time.
- Media uploads (`Exercise.image`) need `Pillow` (added to `requirements.txt`) and `MEDIA_URL`/`MEDIA_ROOT` (added to settings, served via `static()` in `urls.py` when `DEBUG=True`).
- `workouts/management/commands/seed_exercises.py` mirrors `seed_food_items` — idempotent, seeds ~20 common exercises + muscle groups + a few beginner-friendly `alternatives`. Media fields are left blank (no fabricated image/video URLs).
- `FoodLog.source` has a model-level default (`plan`) purely so the migration didn't need a one-off default on the NOT-NULL column (table was empty); the API still requires the client to pass it explicitly (`FoodLogSerializer.Meta.extra_kwargs = {"source": {"required": True}}`) so a missing `source` is a 400, not a silent default.
- Re-verified end-to-end with another throwaway `APIClient` smoke script covering all of the above (exercise bank browsing, day-of-week plans, all three `FoodLog` paths, QA thread + reply + status change, trainer note + `mark_read`, daily metric + activity log, dashboard for both roles, and IDOR rejection on each new resource) — cleaned up after, not committed.

## Resolved Design Decisions

These were previously open questions, now settled:

- Workout plan structure: fixed weekly schedule of days, each with a fixed list of exercises/sets/reps, authored by the trainer.
- Reps/weight granularity: logged per set, not per exercise.
- Diet plan scope: a reference meal plan (specific meals + ingredients + reference weights), not calorie/macro targets.
- Barcode/food data source: self-seeded reference table for Stage 1; Open Food Facts API integration planned for a later stage.
- Trainee accounts: trainees have their own logins and log their own data (not entered by the trainer on their behalf).
- Food log linkage: `FoodLog` can link to a `ReferenceMealItem` (planned adherence), a raw `FoodItem` (barcode/manual, not tied to a plan), or a `QuickLogItem` (private per-trainee shortcut) — exactly one of the three, enforced in the serializer and in `FoodLog.clean()`. Nutrients are computed once at save time and stored as a snapshot on the row, so later edits to a `FoodItem`/`QuickLogItem` don't retroactively change historical logs.
- Workout session linkage: `WorkoutSession` ties to a specific `PlanDay`, which pre-fills the prescribed template to log actuals against.
- `QuickLogItem` is **private to its owner** for Stage 1 — no sharing/moderation. See **Deferred** below.
- `day_of_week` (nullable, `null` = "applies every day") is used identically on `PlanDay` and `ReferenceMeal` for weekday/weekend/fixed-daily schedules — no separate boolean, same convention in both apps (`workouts.DayOfWeek` choices, imported into `nutrition`).
- Exercise bank writes follow the same trust model as `FoodItem`: any trainer can add/edit (shared reference data, not trainee-scoped); all trainees get read access.
- Trainer connection (`connection` app): `QAThread`/`QAMessage` use plain `IsAuthenticated` + queryset scoping (both roles read/write within their own relationship) rather than an asymmetric permission class, since both parties post messages; `TrainerNote` stays asymmetric (trainer writes, trainee read-only + a dedicated `mark_read` action).
- Daily tracker (`tracker` app): `DailyMetric` is `unique_together(trainee, date)` — one row per trainee per day; `ActivityLog` allows multiple rows per day. The dashboard is a plain aggregation endpoint (`GET /api/tracker/dashboard/`), not a model.

## Deferred (not built yet — don't forget)

- **Public/shared `QuickLogItem`s**: an `availability` (`private`/`public`) + `approval_status` (`pending`/`approved`/`rejected`) moderation workflow so a trainee's saved shortcut can be shared community-wide after admin approval. Skipped for Stage 1 (10 users, private-only is enough); revisit if trainees start asking to share shortcuts.
- **`ProgressPhoto`**: a dated progress-photo model (optionally linked to a `WorkoutSession`), feeding into the dashboard. Skipped for Stage 1; add alongside the dashboard endpoint when wanted.
