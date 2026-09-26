# TDEE Calculation — Implementation Spec

## Revision 2 (partial-data tiers)

Revision 1 (below) assumed a trainee always provides a single daily Active Energy
total. In practice a day might have some data but not that: steps logged with no watch
total, or a workout/activity with its own device-reported calories but still no daily
total. "Movement energy" (everything in the TDEE total besides BMR and TEF) is now a
per-day priority waterfall over whichever of these actually exists that day - evaluated
independently per day, not a global setting:

**Tier 1 — a daily Active Energy total was entered** (`DailyMetric.active_energy_kcal`).
Exactly Revision 1's model: `movement energy = active_energy`. Any per-session
workout/activity calories that day are informational only (exercise history/PRs), not
summed in.

**Tier 2 — no daily total, but at least one logged workout/activity that day has its
own device-reported calories** (`WorkoutSession.calories_burned` /
`ActivityLog.calories_burned`). This is the overlap case Revision 1 was written to
avoid in miniature: a logged 40-minute run with device-reported calories also generated
steps during that same window.
```
logged_activity_calories = sum(calories_burned) across that day's WorkoutSessions/ActivityLogs that have one
steps_to_subtract = sum(activity_met.steps_per_minute * duration_minutes) for every step-generating ActivityLog that day (regardless of whether it has its own calories_burned - the step overlap happened either way)
remaining_steps = max(0, day_steps - steps_to_subtract)
neat = remaining_steps * weight_kg * NEAT_KCAL_PER_STEP_PER_KG
movement energy = logged_activity_calories + neat
```
`ActivityMET.steps_per_minute` (null = doesn't generate steps) is the new field this
needs: an approximate walking/running-gait cadence per activity type. Only set for
activities with an actual footfall gait (walking, running, hiking, court sports, ...) -
machine-based (cycling, rowing machine, elliptical), water/wheeled/gliding (swimming,
skiing, skating), seated (horseback riding), and static (yoga, weightlifting) activities
stay null. `WorkoutSession` has no "type" of its own and is always treated as
non-step-generating (it's this app's strength-training log - lifting is explicitly a
non-step-generating example below).

**Tier 3 — no daily total and no per-session calories at all that day.**
```
movement energy = day_steps * weight_kg * NEAT_KCAL_PER_STEP_PER_KG   (i.e. neat from every step, nothing subtracted)
```
Never estimate workout calories from duration/MET tables here - too imprecise to
present with the same confidence as Tier 1/2. A logged workout/activity with no
calories entered still stores its own duration/sets for history; it just contributes 0
to the total. The API's `calories_burned_breakdown.tier` is `3` in this case, and the
frontend labels the total as a lower-confidence, partial-data estimate (a small
"estimate" label and a "≈" prefix on the number) rather than presenting it like 1/2.

This replaces Revision 1's flat "always Tier 1" assumption; Revision 1's own note below
about *why* steps and logged-activity calories can't just be added on top of each other
unconditionally still explains Tier 2's step-subtraction step.

## Revision 1 (double-counting fix)

The original additive model below (`BMR + NEAT + EAT + TEF`) double-counted: if a
trainee goes for a 40-minute run and logs it as a workout/activity with the calories
their watch reported for that session, the watch has *also* added steps to that day's
step count for the same 40 minutes. The step-based NEAT estimate then billed those same
40 minutes again.

This is now:

```
TDEE = BMR + Active Energy (device-reported) + TEF
```

- **Steps** are stored and shown as a movement count only - never converted to
  calories, never part of this total (`DailyMetric.steps`).
- **Logged workouts/activities** (duration, sets, `calories_burned`) are unchanged and
  still useful on their own for exercise history and per-session/per-activity detail -
  they're just no longer separately summed into the daily total.
- **Active Energy** (`DailyMetric.active_energy_kcal`) is a new field: the trainee
  enters their device's own daily Active Energy total (e.g. an Apple Watch's "Active
  Calories") directly. A wearable's own number already reconciles overlapping windows
  (the run above counts once, not twice), which our own additive estimate couldn't.
- The MET-based estimation this replaced (`_workout_met`, the NEAT step formula) has
  been removed from `tracker/services.py::calculate_tdee` as dead code. `ActivityMET`
  and its `met_value` stay as-is - they're still real reference data backing the
  Activity Log's activity-type picker, just no longer feeding this calculation.

The sections below describe the original (now superseded) NEAT/EAT model, kept for
historical context on the MET table and its seed values, which are unrelated to the fix
above and still in use.

## Concept

Replace the crude `BMR × activity-factor bucket` model with an **additive component model**. Each energy component is computed from data we already log, instead of collapsing everything into one guessed multiplier.

```
TDEE = BMR + NEAT (from steps) + EAT (from logged activities) + TEF
```

## Components

### 1. BMR — Mifflin-St Jeor (uses profile: age, gender, height_cm, weight_kg)

```
Male:   BMR = 10*weight_kg + 6.25*height_cm - 5*age + 5
Female: BMR = 10*weight_kg + 6.25*height_cm - 5*age - 161
```

### 2. NEAT — from daily step count (continuous, not bucketed)

```
NEAT = steps * weight_kg * 0.00057
```

(~0.04 kcal/step at 70 kg, scales linearly with body weight — derived from walking ≈3.3 METs.)

### 3. EAT — from each logged activity/workout that day (MET-based, not a flat guess)

```
EAT_activity = MET * weight_kg * (duration_min / 60)
EAT_day = sum(EAT_activity) over all activities logged that day
```

Requires a `MET` value per exercise/activity type. Store this as a self-seeded reference table (consistent with existing Stage 1 principle: self-seeded data, no live third-party API dependency), e.g.:

```
ActivityMET
- activity_type (FK to Exercise or a general Activity type)
- met_value (float)
```

Seed common values (e.g. resistance training ≈ 3.5–6 MET depending on intensity, running ≈ 8–12, cycling ≈ 4–10, walking ≈ 3.3) and allow admin edits later.

**Manual override:** if the user optionally enters calories burned for a session, use that value instead of the MET estimate for that session. Priority: `user-entered value (if present) → MET-based estimate (fallback)`. Never leave it blank — always compute the fallback so downstream TDEE math has a number.

**Seed data — MET values for common activities** (source: Compendium of Physical Activities, Ainsworth et al., 2024 update — general/moderate-effort value per activity for Stage 1 simplicity; intensity variants can be added later):

| Activity | MET |
|---|---|
| Walking (moderate pace) | 3.5 |
| Walking (brisk) | 4.3 |
| Jogging | 7.0 |
| Running (10 min/mile) | 9.8 |
| Running (8 min/mile) | 11.5 |
| Cycling (leisure) | 5.8 |
| Cycling (moderate, 12–14 mph) | 8.0 |
| Cycling (vigorous, 16–19 mph) | 12.0 |
| Swimming (moderate) | 5.8 |
| Swimming (vigorous laps) | 9.8 |
| Tennis (singles) | 8.0 |
| Tennis (doubles) | 6.0 |
| Basketball (game) | 8.0 |
| Basketball (shooting around) | 5.0 |
| Soccer (casual) | 7.0 |
| Soccer (competitive) | 10.0 |
| Volleyball | 4.0 |
| Badminton | 5.5 |
| Table tennis | 4.0 |
| Squash | 7.3 |
| Racquetball | 7.0 |
| Golf (walking, carrying clubs) | 4.5 |
| Golf (cart) | 3.5 |
| Bowling | 3.0 |
| Hiking (general) | 6.0 |
| Hiking (with pack) | 7.8 |
| Rock climbing | 8.0 |
| Yoga | 3.0 |
| Pilates | 3.0 |
| Weightlifting (moderate effort) | 3.5 |
| Weightlifting (vigorous effort) | 6.0 |
| CrossFit / HIIT | 8.0 |
| Circuit training | 4.3 |
| Rowing machine (moderate) | 4.8 |
| Rowing machine (vigorous) | 8.5 |
| Elliptical trainer | 5.0 |
| Stair climbing machine | 8.8 |
| Jump rope | 10.0 |
| Dancing (general) | 5.0 |
| Zumba | 6.8 |
| Ballet | 5.0 |
| Martial arts (general) | 10.3 |
| Boxing (sparring) | 12.3 |
| Boxing (punching bag) | 7.0 |
| Kickboxing | 10.0 |
| Downhill skiing (moderate) | 6.0 |
| Cross-country skiing | 9.0 |
| Snowboarding | 5.3 |
| Ice skating | 7.0 |
| Roller skating / blading | 7.5 |
| Kayaking / canoeing | 5.0 |
| Horseback riding | 5.5 |

Implementation note: store this as seed data for the `ActivityMET` table (per the self-seeded data principle — no live third-party API). Admins can add/edit entries beyond this initial 50 as needed.

### 4. TEF — thermic effect of food

```
TEF = 0.10 * calories_consumed_that_day
```

(From the Diet tab's logged intake. If no food logged yet that day, TEF = 0 — don't assume/estimate.)

## Daily pipeline

For a given user + date:
1. `BMR` from profile (static per day unless weight updates).
2. `NEAT` from that day's step count (0 if no steps logged — don't default to "sedentary").
3. `EAT` = sum of MET-based calories across all workout sessions/activities logged that day.
4. `TEF` = 10% of that day's logged food calories.
5. `TDEE = BMR + NEAT + EAT + TEF`.

## Notes for implementation

- Every component independently defaults to 0 when its underlying data is missing for that day — never silently substitute a bucketed guess.
- `weight_kg` should pull from the most recent weight entry ≤ that date, not always "current" weight.
- This calculation should live as a single service/utility function (e.g. `calculate_tdee(user, date)`) so it's reusable across Progress, daily summary, and any future recommendation logic — same "shared component, built once" pattern already used for the exercise history chart.
