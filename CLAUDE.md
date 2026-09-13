# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

Rejim is an application for tracking workouts and diet, built around a **trainer/trainee** relationship: a trainer authors fixed workout and diet plans for each of their trainees, and trainees log their actual sessions/food against those plans. Stage 1 targets a small group (~10 users) — favor the simplest correct Django/React implementation over speculative scale, abstraction, or infrastructure. Scalability is a future concern, not a Stage 1 one.

## Tech Stack

- **Backend:** Django + Django REST Framework, in `backend/` (`manage.py`, `config/` settings, feature apps: `accounts`, `workouts`, `nutrition`, `connection`, `tracker`, `progress`, `usersettings`, `dataexport`, `trainerdashboard`). Virtualenv at `backend/.venv/` (gitignored) — run tooling via `backend/.venv/bin/python manage.py ...`.
- **Frontend:** React + TypeScript, Vite, in `frontend/`. Tailwind CSS v4 + shadcn/ui (Radix base, "Nova" preset, brand purple `#4c236b`). Dev server proxies `/api` → `localhost:8000` (no CORS package needed).
- **Database:** SQLite for local dev; Postgres in production.
- **Auth:** DRF token auth (`rest_framework.authtoken`), token kept in `localStorage`. Two dev accounts live directly in the gitignored `db.sqlite3`: `trainer1`/`devpass123`, `trainee1`/`devpass123` (trainee1's trainer = trainer1) — recreate manually if the DB is ever reset.

## Users: Trainers and Trainees

- Independent `is_trainee`/`is_trainer` booleans on `accounts.User` (not a single `role` field) — a dual-role account (e.g. a trainer who also logs their own training) is fully supported. `Trainee.trainer` is a simple FK; a trainee has at most one trainer at a time.
- Plans (workout/diet) are authored by the trainer; trainees log actuals against them and never edit the plan structure itself.
- **Login is a two-door pattern**: the primary card is trainee login/signup; `?as=trainer` swaps to a login-only "Are you a trainer?" door (same credentials — trainers are still admin-provisioned, no self-serve trainer signup). Which door was used only picks the initial `viewMode`/landing dashboard, silently corrected if it doesn't match the account's actual flags. `viewMode` persists in `localStorage` and is switchable in-session (a dual-role account gets a quiet nav link both ways). While `viewMode === 'trainer'`, nav is trimmed to what a trainer actually needs: `BottomNav` shows three tabs — Food Bank and Exercise Bank flanking an emphasized, centered Trainees tab (the trainer's home) — and `NavDrawer` collapses to just Profile, since the trainee-only tabs/settings don't apply. Food Bank/Exercise Bank are reached via unguarded top-level routes (`/food-bank`, `/exercise-bank`) that reuse the same `FoodBankPage`/`ExerciseBankPage` components trainees reach at `/diet/food-bank`/`/workout/exercises` — both are shared reference data (any trainer can write, everyone can read), so there's no trainee/trainer-specific variant to maintain.
- Shared access-control building blocks (reused across nearly every viewset, don't duplicate): `IsTrainerWriteTraineeReadOnly` / `IsTraineeWriteTrainerReadOnly` / `EditRequestPermission` (`accounts/permissions.py`), `TraineeScopedQuerysetMixin` (`accounts/mixins.py` — scopes a queryset via a per-viewset `trainee_path`), and IDOR-safe serializers (every writable FK's queryset restricted in `__init__` to what the requester may actually reference). Where a request is ambiguous between "act as myself" and "act on a named trainee" (only possible because of dual-role accounts), the rule is **explicit-target presence**: an explicit `?trainee_id=`/`trainee` field means "for that trainee" (validated against the requester's own trainees); omitting it means "for myself." This only applies to list/create, though — retrieve/update/partial_update/destroy skip the branching entirely and match either capacity (own record, or a trainee's as their trainer), since the pk in the URL already pins the object and there's nothing left to disambiguate; every trainer-dashboard by-id call (edit, delete, reorder) relies on this rather than passing `trainee_id`.

## Core Features

### 1. Workout Tracking
`WorkoutPlan` (trainee, `sessions_per_week`) → `PlanSession` (label/order — a **rotation**, not a calendar day; notes) → `PlanExercise` (FK `Exercise`, target_sets, target_reps_min/max, default_rest_seconds, notes) → `WorkoutSession` (trainee, plan_session, date, notes, duration_minutes; `unique_together(trainee, plan_session, date)` — re-logging replaces) → `LoggedExercise` (order) → `LoggedSet` (weight, reps_done, rest_seconds, is_warmup, rpe 1–10).
- Logging is per-set, one set revealed at a time (you can't do set 2 before set 1); warm-ups are their own section above working sets. Exercise cards are an accordion (only one open at a time, owned by the parent form) with up/down reordering.
- Weight suggestions, PR detection, and the rest timer are all **client-side only**, computed from an already-fetched `GET .../logged-sets/?exercise=` history — no backend fields/endpoints for any of it.
- `PlanSession.notes`/`PlanExercise.notes` are trainer guidance, shown read-only to the trainee while logging; trainer-editable inline on Workout → Plan.

### 2. Diet Tracking
`DietPlan` (trainee) → `ReferenceMeal` (label/order, optional `day_of_week`) → `MealOption` (a named alternative, e.g. "Smoothie" vs. "Overnight Oats") → `ReferenceMealItem` (FK `FoodItem`, reference_weight_grams). `FoodItem` (per-100g nutrition incl. 5 micros; `kind` single/composite; `created_by`/`visibility`/`approval_status` for sharing; `serving_unit`/`serving_size_grams` as an entry/display convenience only; `macro_filters`/`dietary_tags` M2Ms, fixed vocab, for substitution search) → `FoodItemComponent` (composite ingredient breakdown) → `FoodLog` (trainee; exactly one of `reference_meal_item`/`food_item`/`quick_log_item`; optional `logged_meal` FK; nutrients snapshotted at save time so later edits to a `FoodItem` don't retroactively change history) → `LoggedMeal` (trainee, reference_meal, date, source plan/custom; `unique_together` — re-logging replaces).
- A trainee logs against a specific reference item and enters the actual weight measured; nutrients are computed from actual weight, not reference weight.
- Food Bank sharing: private `FoodItem`s are visible only to their creator (no approval needed); public ones need approval from any trainer. Composite items recompute their per-100g nutrition automatically from components. Any trainer can edit/delete any `FoodItem`; a trainee can edit/delete only ones they created themselves. A trainee who can't edit an item directly can instead file a `FoodItemEditRequest` (a freeform description, no structured diff) for a trainer to review and mark resolved — mirrors `ExerciseEditRequest` in the Exercise Bank.
- `macro_filters`/`dietary_tags` back a live "alternatives" query (other items sharing a macro filter, ranked by calorie closeness) — computed at request time, not stored (unlike `Exercise.alternatives`, which is a stored self-M2M since the Exercise Bank is small enough to fetch in full).
- Nutrient math (`nutrition/services.py::scale_nutrients`/`sum_nutrients`/`average_nutrients`) lives in one place server-side and is mirrored client-side (`lib/nutrients.ts`) for live previews.

### 3. Trainer Connection (Q&A + Notes)
`QAThread` (subject, status open/answered/archived) containing `QAMessage`s — either party can post, change status, or open a new thread (a trainer must name which trainee it's about). `TrainerNote` — trainer-authored, trainee-read-only, auto-marked read as soon as the trainee opens the Notes view.
- Not to be confused with `TrainerConnection` (section 7) — that's the one-time request to *get* a trainer in the first place; this assumes the relationship already exists.

### 4. Exercise Bank
`Exercise` (shared reference data — any trainer can write, all trainees can read, same trust model as `FoodItem`): name, description, equipment, `primary_muscle_groups`/`secondary_muscle_groups` (M2M `MuscleGroup`), difficulty_level, optional image/video_url, self-M2M `alternatives` (non-symmetrical). `PlanExercise` references `Exercise` by FK rather than freeform text. A trainer can add/edit any exercise, with a live front/back muscle-highlight preview (`body-highlighter` package) as primary/secondary muscles are picked; a trainee can't edit directly but can file an `ExerciseEditRequest` (freeform description) for a trainer to review and resolve. Browse UI: search/filter, the same muscle diagram, alternatives resolved client-side from the in-memory ~100-row list.

### 5. Daily Tracker
`DailyMetric` (one row per trainee per day: weight+unit, steps, sleep hours, sleep_quality 1–5, readiness 1–5, water_intake_ml, notes — all optional, upserts on date). `ActivityLog` (freeform activity type + duration, multiple per day, optional calories_burned + notes).
- `GET /api/tracker/daily-summary/?date=` computes a read-side rollup (consumed calories/macros from that day's `FoodLog`s, burned from `ActivityLog.calories_burned` only — `WorkoutSession` has no calorie field or estimation formula), computed on request and never stored.

### 6. Settings & Personalization
Hamburger menu (`NavDrawer`): Profile, Goals, Plan Management (pure nav shortcut), Units & Preferences, Reminders, Data Export.
- `Goal` (weight or strength type, optional target_date, `is_active`) is trainer-readable; **write ownership flips**: a trainee can write their own goals only while unassigned (`trainer_id is None`), once assigned only that trainer can write (state-based, so it applies retroactively too).
- `UserPreference`/`ReminderSetting` are fully private to the owner (no trainer branch at all) — personal account settings, not training data.
- `Notification`/`PushSubscription` back reminder delivery (real Web Push via `pywebpush`, dev-only VAPID keys in `config/settings.py`). Delivery runs via the `send_due_reminders` management command, intended for a plain OS cron entry — **no Celery/task queue yet** (see Deferred).
- Data Export: 3 self-only CSV endpoints (diet/workout/daily-metrics), date-range filtered.

### 7. Onboarding Wizard & Initial Trainer Assignment
Self-service **signup** (`POST /api/auth/signup/`, trainee-only — trainers stay admin-provisioned). A 4-step `/onboarding` wizard (Baseline → Goals → Preferences → Trainer Connection), skippable/resumable, sharing components with `/profile`.
- Baseline fields (`height_cm`, `age`, `starting_weight`) live directly on `User`. A computed (never stored) `bmi`/`bmi_category` is resolved via `accounts/services.py`, using the latest `DailyMetric` weight if one exists, else `starting_weight`.
- `TrainerConnection` (`connection` app): `option_selected` (no_preference/specific_trainer/train_myself — the last rejected server-side, shown "coming soon" in the UI), `status` (pending_manual_assignment/active/not_applicable), `assigned_trainer`. Assignment is a **manual Django admin action** — setting `assigned_trainer` also flips `status` to `active` and syncs `User.trainer` in one `save()` override.

### 8. Trainer Dashboard
The trainer's actual workspace.
- **Trainee roster** (`/trainees`): every trainee via `User.trainer`, searchable by name, filterable by weight trend / consistency % / days-inactive — all computed in Python (`trainerdashboard/services.py`), not an ORM aggregation (fine at this app's scale).
- **Trainee detail** (`/trainees/:id`): a Goals section plus tabs for Diet Plan, Workout Plan, Progress (read-only, scoped), Notes & Q&A.
- **Diet/Workout plan editing is real, full CRUD** (create/edit/delete/reorder at every level) — the backend already permitted this via existing `IsTrainerWriteTraineeReadOnly` viewsets; this was purely a frontend gap. Every edit is logged to `PlanChangeLog` (a one-line summary, not a diff) via a shared `PlanChangeLoggingMixin`.
- `TrainerPrivateNote` (trainer-only scratchpad, never trainee-visible) is distinct from the trainee-visible `TrainerNote` in section 3.

### Progress Tab
A read-only cross-category dashboard: an Overview chart plus Training/Nutrition/Recovery/Consistency sub-dashboards, one shared date-range control (today/yesterday/week/month/~10yr "all time"/custom). Backed by six pure-aggregation `/api/progress/` endpoints (`progress` app, no new models). PR events and every chart are computed/rendered client-side as hand-rolled inline SVG (no charting library, kept consistent with the rest of the app); Session History and Diet History browsers expose exact past logs. The Photos section is a placeholder (`ProgressPhoto` deferred).
- Training's per-exercise Strength view (`TrainingStrengthPanel`) additionally shows an all-time PR summary (independent of the selected date range) and a toggleable Volume (Σ weight×reps per day) line alongside weight/avg-reps-per-set on `ExerciseHistoryChart`; clicking any date column on that chart shows an inline box with that day's exact weight/reps/volume. Fetching a trainee's exercise history from here requires passing `trainee_id` explicitly (see `listExerciseHistory`) — the trainer-dashboard-by-id exception above doesn't cover this endpoint since it's a `list` action, not retrieve/update/destroy.

## Conventions

- RESTful, resource-oriented endpoints (`/api/workouts/sessions/`, `/api/nutrition/food-items/`, ...).
- Nutrient math belongs in a model method or `services.py`, never duplicated in views/serializers.
- Write a migration for every model change; never hand-edit migration files.
- DRF serializers + viewsets over hand-rolled views unless there's a good reason not to.
- Small, feature-scoped frontend components (`WorkoutLogger`, `FoodLogEntry`, etc.) over large page components.
- Structured logs that replace-on-relog (`LoggedMeal`, `WorkoutSession`, `DailyMetric`) always POST/PUT the **complete current state**; the backend upserts. Don't build granular per-field PATCH flows for these.
- Client-side-only concerns, deliberately not backend fields: PR detection, weight suggestions, rest timer, moving averages — anything derivable from already-fetched history, kept off the API so tweaking the logic never needs a version bump.
- A dropdown/search list living inside a card must be a portaled Radix `DropdownMenu`/`Popover`, never an absolutely-positioned `<div>` — cards use `overflow-hidden` and will clip it.
- Avoid horizontally-scrolling pill/filter rows at mobile width — use a `Select` dropdown or an icon+label row instead.
- No auth/infra complexity beyond ~10 users' needs — flag it if a request looks like scope creep for this stage.

## Where things stand

The full Stage 1 feature set described above is built end-to-end (data model, DRF API, React frontend) for Workout, Diet, Trainer Connection, Exercise Bank, Daily Tracker, Settings/Personalization, Onboarding, Trainer Dashboard, and Progress, including dual-role trainer/trainee accounts. See git history for the build sequence.

**In progress:** production deployment — see "Deployment" below. Code is written and tested locally but the app is **not live yet**.

**In progress:** DB backup/restore. `scripts/backup_db.sh` + `scripts/restore_db.sh` are written, committed, and pushed (2026-09-12) — daily local `pg_dump`, weekly `--upload` to a dedicated `rejim-db-backups` Object Storage bucket, 7-day local retention. The user has a full manual runbook (OCI bucket + PAR creation, `.env.prod` edit, manual test run, two `crontab` lines) but as of the last session hadn't confirmed running it yet — **don't assume the bucket/PAR exist or cron is wired up; ask before treating backups as live.** See Deployment steps 7–9 below for the exact runbook.

Known gaps (unbuilt corners, not bugs):
- No shared "which trainee am I viewing" concept — the Trainer tab, Progress, and Goals pages each have their own local trainee-picker.
- No trainer-facing surface for `PlanChangeLog`, or for a trainee's `meal_preferences`/workout preferences/`injury_notes` captured during onboarding.

## Deferred (not built — don't forget)

- Public/shared `QuickLogItem`s (availability + approval workflow).
- `ProgressPhoto` (dated progress photos, timeline, before/after compare).
- Measurement-unit picker in the composite ingredient-builder's inline "add new ingredient" form (grams-only there today).
- Full task queue (Celery + Redis + celery-beat) replacing the cron-based `send_due_reminders`.
- Email delivery for reminders/goal-completion (`channel_email` toggle exists in the UI, currently inert).
- Trainer-facing view of a trainee's `meal_preferences`/workout preferences/`injury_notes`.
- "Train myself" mode (logging-only, no trainer relationship) — rejected server-side, disabled in the UI.
- Trainer directory/search (today: free-text `requested_trainer_name`).
- Automatic trainer matching (today: fully manual Django-admin assignment).
- Accept/decline step for trainer assignment (today: the admin action is final and immediate).
- Long-term goal-completion UX (auto-archive vs. persistent indicator vs. prompt) — today a completed goal just stays active forever with a one-time notification.
- Trainee-facing view of `PlanChangeLog`.
- Real version diffing for plan changes (today: a one-line chronological summary only).
- Drag-and-drop reordering (today: up/down chevrons everywhere).

## Deployment

Production Docker infrastructure is written and tested locally, but **not yet live**. It mirrors the sibling **AllIn** project's shared-Caddy topology on the same Oracle instance — no nginx/certbot in this repo; Caddy (owned by AllIn) handles TLS and reverse proxying.

**Done (in this repo):** env-driven `backend/config/settings.py` (Postgres/SQLite switch, `SECRET_KEY`/`DEBUG`/`ALLOWED_HOSTS`, CORS/CSRF trusted origins, secure-cookie/proxy-SSL settings, `whitenoise` for `/static/`); `backend/Dockerfile` + `entrypoint.sh` (wait-for-Postgres → migrate → collectstatic → gunicorn on `:8001`); `frontend/Dockerfile` (one-shot build that copies `dist/` into a shared volume, no nginx container); `docker-compose.prod.yml` (`db` + `backend` + `frontend-build`, `backend` on an external `caddy` Docker network aliased `rejim-backend`); `.env.prod` at the repo root (gitignored, holds real secrets — must be copied to the server manually, never via `git pull`); `scripts/backup_db.sh` + `scripts/restore_db.sh`, ported from the AllIn app's own scripts of the same name (same Oracle instance) — daily `pg_dump --clean --if-exists` of the `db` service, gzipped to `~/rejim-backups/`, pruned past 7 days; `--upload` additionally PUTs the dump to a dedicated `rejim-db-backups` Object Storage bucket via a write-only pre-authenticated request URL (`BACKUP_PAR_URL` in `.env.prod`) — a separate bucket/PAR from AllIn's own, so a leaked one can't touch the other app's backups.

**Left, all on the server or in AllIn's own repo — none of it in this repo (steps 7–9 are the backup runbook, status unconfirmed as of 2026-09-12 — see "Where things stand" above):**
1. Copy `.env.prod` to the server (not via git).
2. One-time: `docker network create caddy` + `docker volume create rejim_frontend_dist`.
3. In AllIn's repo: add a Caddyfile site block for `rejim.soroushazizzadeh.com` (reverse-proxy `/api*`, `/admin*`, `/static/*`, `/media/*` to `rejim-backend:8001`; `file_server` everything else from a new `/srv-rejim` root), mount the shared volume/network onto AllIn's `caddy` service, then `docker compose up -d caddy`.
4. Here: `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build db backend`, then run the one-shot `frontend-build` service (re-run whenever frontend code changes).
5. Confirm DNS for the domain points at the box, then hit it in a browser — Caddy auto-issues its own TLS cert on first request.
6. Create the first production superuser and re-seed reference data (`seed_food_items`, `seed_exercises`, etc.) against the fresh Postgres DB.
7. `chmod +x scripts/backup_db.sh scripts/restore_db.sh`, then two `crontab -e` lines: daily local-only (`0 3 * * * cd /path/to/Rejim && ./scripts/backup_db.sh >> ~/rejim-backups/backup.log 2>&1`) and weekly with `--upload` appended (`0 3 * * 0 ...`), staggered a few minutes from AllIn's own two cron lines so they don't hit `docker compose exec` at the same moment.
8. To enable `--upload`: create the `rejim-db-backups` Object Storage bucket (OCI console, Always Free tier) with its own Pre-Authenticated Request (Access Type: "Permit object writes" — write-only, so a leaked URL can't read/list/delete existing backups), then add `BACKUP_PAR_URL="https://objectstorage.<region>.oraclecloud.com/p/<token>/n/<namespace>/b/rejim-db-backups/o/"` to `.env.prod` (quoted, no angle brackets). Test both `./scripts/backup_db.sh` and `./scripts/backup_db.sh --upload` manually before trusting cron, and confirm the object lands in the bucket via the OCI console.
9. Restore (destructive — prompts for confirmation): `./scripts/restore_db.sh ~/rejim-backups/rejim-<timestamp>.sql.gz`.
