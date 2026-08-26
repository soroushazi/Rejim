# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

An application for tracking workouts and diet. Stage 1 is intentionally minimal: get core logging working end-to-end for a small group of users (~10) before adding scale, polish, or advanced features.

**Do not over-engineer.** Avoid speculative abstractions, premature microservices, multi-tenant complexity, or infrastructure aimed at scale we don't need yet. Favor the simplest Django/React implementation that correctly models the data below. Scalability is a *future* concern — note it in comments/TODOs if relevant, but don't build for it now.

## Tech Stack

- **Backend:** Django (+ Django REST Framework for the API)
- **Frontend:** React (web app)
- **Database:** Postgres preferred if available; SQLite is acceptable for Stage 1 local dev
- **Auth:** Simple session or token auth is sufficient for ~10 users — no need for complex SSO/OAuth infra

When scaffolding, prefer Django's conventional project layout (`manage.py`, one `config`/project settings app, feature apps like `workouts`, `nutrition`, `accounts`) and Create React App/Vite defaults for the frontend, unless the repo already has an established structure — check first.

## Core Features (Stage 1 scope)

### 1. Workout Tracking
- User inputs a **workout plan** upfront (e.g., a weekly split: which days, which exercises are planned per day).
- User logs each **gym session** against that plan:
  - Day of the workout
  - Exercises performed
  - Number of sets
  - Number of reps (per set, or per exercise — confirm which granularity is wanted if ambiguous)
- Suggested core models: `WorkoutPlan`, `PlannedExercise` (or `PlanDay` + `PlanExercise`), `WorkoutSession` (a log entry, date-stamped), `LoggedExercise`, `LoggedSet` (sets/reps/weight if added later).

### 2. Diet Tracking
- User inputs a **diet plan** upfront (target calories/macros, or planned meals — confirm scope with the user if unclear).
- A **reference document/database** of ingredients and products (e.g., "Greek yogurt") storing nutrition info per unit (e.g., per 100g).
- **Barcode scanning:** scan a product → look up its reference entry.
  - Stage 1: it's fine to integrate a public food/barcode API (e.g., Open Food Facts) or seed a local reference table manually — pick whichever is simplest to implement well; ask the user if unsure.
- User enters the **weight/amount consumed** of a scanned/selected item.
- App **calculates**, based on amount consumed:
  - Calories
  - Macronutrients (protein, carbs, fat)
  - Micronutrients (where data is available)
- Suggested core models: `DietPlan`, `FoodItem` (the reference entry: name, barcode, calories/macros/micros per 100g or per unit), `FoodLog` (date, `FoodItem`, amount consumed, computed totals).

## Conventions

- Keep API endpoints RESTful and resource-oriented (e.g., `/api/workouts/sessions/`, `/api/nutrition/food-items/`, `/api/nutrition/logs/`).
- Nutrient math (scaling per-100g values by consumed weight) belongs in a model method or a small service/util function, not duplicated in views or serializers.
- Write migrations for every model change; don't hand-edit migration files.
- Prefer Django REST Framework serializers + viewsets over hand-rolled views unless there's a good reason not to.
- Keep frontend components small and feature-scoped (`WorkoutLogger`, `BarcodeScanner`, `FoodLogEntry`, etc.) rather than one large page component.
- No auth/infra complexity beyond what ~10 users need — flag it if a request seems to be scope creep for this stage.

## Open Questions to Confirm With the User (if relevant to the task at hand)

- Exact structure of a "workout plan" (fixed weekly schedule vs. flexible list of exercises).
- Whether reps/weight are tracked per set or as a single number per exercise.
- Whether the diet plan is calorie/macro targets, a specific meal plan, or both.
- Which barcode/food database to integrate (third-party API vs. self-maintained reference table) if the task touches that feature.

When a task is ambiguous relative to these open questions, make a reasonable assumption, state it briefly, and proceed — don't block on asking unless it would clearly send the implementation in the wrong direction.
