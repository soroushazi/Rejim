import { apiFetch } from './client'
import type { User } from './types'

/** A trainer's own trainees - used to pick who a new note/thread is about. */
export function listTrainees(): Promise<User[]> {
  return apiFetch<User[]>('/accounts/trainees/')
}
