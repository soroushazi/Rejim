# TDEE Calculation — Implementation Spec

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
