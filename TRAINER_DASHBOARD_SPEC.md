# Trainer Dashboard Spec

## 1. Overview

Trainer functionality lives in the **same app** as the trainee experience, not a separate app, gated by role (`user.role == trainer`). The trainer's core needs, viewing a trainee's goals/preferences/progress and editing their plans, are read/write access to data the app already owns, so this reuses existing components (Progress tab, Plan Management editing) pointed at a specific trainee's data rather than building parallel functionality.

Structure: a **trainee list** (trainer's home screen) with search and filters, and a **trainee detail page** with tabs for Diet, Workout, Progress, and Notes & Q&A.

## 2. Trainee List (trainer home screen)

Shows every trainee assigned to the logged-in trainer via `TrainerConnection`.

- **Search**: by trainee name.
- **Filters**:
  - Weight trend: losing / gaining / maintaining (derived from recent `DailyMetric` weight entries vs. their weight goal direction).
  - Consistency: flags trainees with low adherence (reuses the same adherence calculation as the trainee's own Consistency dashboard).
  - Inactivity: flags trainees with no logged activity in the last N days, surfaced directly in the list rather than requiring the trainer to open each trainee individually.
- **Per-row display**: trainee name, a quick trend indicator, consistency percentage, last-active date. Enough to scan the whole roster and spot who needs attention without opening anyone.

## 3. Trainee Detail Page

Tabbed view, opened by selecting a trainee from the list:

### Diet Plan tab
View and edit that trainee's diet plan. Reuses the existing Diet tab's Plan Management editing surface, just accessed from the trainer's side with edit permission.

### Workout Plan tab
Same pattern, reuses the Workout tab's Plan Management editing surface.

### Progress tab
Reuses the trainee Progress tab exactly as spec'd (overview chart, Training/Nutrition/Recovery/Consistency dashboards, photos), scoped to this one trainee. Read-only for the trainer, this is a viewing surface, not an editing one.

### Notes & Q&A tab
Two sections:
- **Trainer notes**: private scratchpad, visible only to the trainer, never shown to the trainee. Free text, timestamped entries.
- **Q&A thread**: a simple message thread visible to both the trainer and that trainee, for back-and-forth questions. Not real-time chat for Stage 1, a basic append-only list of messages with sender and timestamp is enough.

## 4. Plan Change History

When a trainer edits a trainee's diet or workout plan, log the change: what changed, when, by whom. Shown as a simple chronological list within the Diet/Workout tab (e.g. "Workout plan updated, Sep 3"), so the trainer has a record without needing to compare versions manually.

## 5. Data Models

`TrainerNote`:

| Field | Type | Notes |
|---|---|---|
| `trainer` | FK to User | |
| `trainee` | FK to User | |
| `content` | Text | |
| `created_at` | DateTime | |

`QAMessage`:

| Field | Type | Notes |
|---|---|---|
| `trainer` | FK to User | |
| `trainee` | FK to User | |
| `sender` | FK to User | Either the trainer or the trainee. |
| `content` | Text | |
| `created_at` | DateTime | |

`PlanChangeLog`:

| Field | Type | Notes |
|---|---|---|
| `trainee` | FK to User | |
| `changed_by` | FK to User | The trainer who made the edit. |
| `plan_type` | Enum: `diet` / `workout` | |
| `summary` | Text | Short description of what changed. |
| `created_at` | DateTime | |

No new models needed for the Diet/Workout/Progress tabs themselves, those are the existing models, just accessed with the trainer's edit permission.

## 6. API Endpoints

- `GET /api/trainer/trainees/` — list assigned trainees, with query params for search and the three filters (trend, consistency, inactivity).
- `GET /api/trainer/trainees/{id}/overview/` — that trainee's baseline, goals, and preferences from onboarding.
- `PATCH /api/trainer/trainees/{id}/goals/` — trainer edits that trainee's goals. Goal editing is trainer-only (see Resolved Decisions), so the trainee's own Goals view becomes read-only once a trainer is assigned.
- Existing Diet/Workout plan endpoints, called with the trainee's ID instead of "self," gated by the trainer's `TrainerConnection` to that trainee.
- Existing Progress endpoints, same pattern, scoped to the trainee's ID.
- `GET/POST /api/trainer/trainees/{id}/notes/` — trainer notes for that trainee.
- `GET/POST /api/trainer/trainees/{id}/qa/` — Q&A thread for that trainee, also accessible to the trainee from their own side.
- `GET /api/trainer/trainees/{id}/plan-history/` — plan change log.

## 7. Resolved Decisions

- **Goal editing**: trainer-only. Once a trainer is assigned, the trainee's own Goals view becomes read-only, the trainer is the one who sets and adjusts weight/strength goals from that point.
- **Notes are two distinct things**: the Q&A thread is visible to both trainer and trainee. Trainer notes are a separate, private scratchpad, visible only to the trainer, never surfaced to the trainee. Both already reflected above as `TrainerNote` (private) and `QAMessage` (shared).
