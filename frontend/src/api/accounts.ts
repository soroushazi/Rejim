import { apiFetch } from './client'
import type { User } from './types'

/** A trainer's own trainees - used to pick who a new note/thread is about. */
export function listTrainees(): Promise<User[]> {
  return apiFetch<User[]>('/accounts/trainees/')
}

export type ProfileUpdate = Partial<
  Pick<
    User,
    | 'first_name'
    | 'last_name'
    | 'height_cm'
    | 'age'
    | 'starting_weight'
    | 'starting_weight_unit'
    | 'meal_preferences'
    | 'meal_preferences_notes'
    | 'workout_days_per_week'
    | 'workout_session_minutes'
    | 'gym_location'
    | 'experience_level'
    | 'injury_notes'
    | 'onboarding_completed'
  >
>

export function updateProfile(data: ProfileUpdate): Promise<User> {
  return apiFetch<User>('/accounts/me/', { method: 'PATCH', body: JSON.stringify(data) })
}

export function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  return apiFetch<void>('/accounts/change-password/', {
    method: 'POST',
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  })
}
