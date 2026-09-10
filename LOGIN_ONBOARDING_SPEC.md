# Login / Onboarding Spec

## 1. Overview

Login/auth mechanics are explicitly out of scope for this spec, to be discussed separately. This covers the **onboarding wizard** a trainee goes through right after signup: a multi-step flow (not one long form) in this order:

1. Baseline
2. Goals
3. Preferences
4. Trainer Connection

## 2. Step 1: Baseline

Fields: height, age, starting weight + unit (kg/lb).

Stored on the user's **Profile** (same model referenced in the Profile spec). BMI is computed from height and the latest available weight (starting weight until a Daily log exists), not stored.

*Assumption carried over from earlier discussion, not yet explicitly confirmed*: experience level (beginner/intermediate/advanced) and equipment access (home/bodyweight vs. full gym) were suggested as useful trainer-facing signals. Included here as optional fields on this step, flag if you want these cut before build.

## 3. Step 2: Goals

Same shape as the standalone `Goal` model:

- Weight goal: target weight + unit, direction (lose/gain/maintain).
- Strength goals (optional, can add multiple): exercise + target value.

Submitting this step creates `Goal` records directly, using Step 1's starting weight as the baseline rather than asking for it again.

## 4. Step 3: Preferences

- **Dietary preferences**: feeds into Diet plan creation (Plan Management).
- **Workout preferences**: feeds into Workout plan creation (Plan Management).

*Assumption carried over, not yet confirmed*: training availability (days per week) and a free-text injury/limitation note were suggested as part of this step. Included here as optional fields, flag if you want these cut before build.

## 5. Step 4: Trainer Connection

Three options, presented as a single choice:

- **"No preference, connect me to one of your expert trainers"** → assignment is **manual** for Stage 1, no auto-matching. Creates a `TrainerConnection` record with `status = pending_manual_assignment` and no trainer attached yet, someone assigns it by hand on the backend.
- **"I want this specific trainer"** → trainee enters the trainer's **full name as free text**, no search or directory lookup exists yet. Creates a `TrainerConnection` record with `status = pending_manual_assignment` and `requested_trainer_name` set, still resolved manually since there's no way to look up and confirm the name against a real trainer record yet.
- **"Train myself"** → **deferred**, not built now. Shown in the UI as a visible but disabled option (e.g. "coming soon") rather than hidden. See Future Tasks.

### Data model

`TrainerConnection`:

| Field | Type | Notes |
|---|---|---|
| `option_selected` | Enum: `no_preference` / `specific_trainer` / `train_myself` | |
| `requested_trainer_name` | String | Only set when `option_selected = specific_trainer`. |
| `status` | Enum: `pending_manual_assignment` / `active` / `not_applicable` | `not_applicable` reserved for when `train_myself` is eventually built. |
| `assigned_trainer` | FK to Trainer, nullable | Filled in manually (e.g. via Django admin) for both `no_preference` and `specific_trainer` cases, since no automated matching or trainer-side acceptance flow exists yet. |

No dedicated "assign trainer" API endpoint needed for Stage 1, this can be a manual admin action rather than a trainee- or trainer-facing feature.

## 6. Future Tasks

- Build the "Train myself" self-service mode (logging-only, no trainer).
- Build a trainer directory with search, so "specific trainer" requests can be validated against real records instead of free text.
- Build automatic assignment/matching for "no preference" requests (by specialty, goal type, or availability) once user count justifies it.
- Build a pending/accept workflow so a requested or assigned trainer can confirm or decline, rather than assignment being final the moment an admin sets it.
- Confirm whether experience level, equipment access, training availability, and injury notes (flagged as assumptions above) should stay in the onboarding flow or be cut.
