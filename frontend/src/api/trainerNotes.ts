import { apiFetch } from './client'
import type { NewTrainerNote, TrainerNote } from './types'

/** Every note the requester can see - own notes for a trainee, all of their
 * trainees' notes for a trainer. Small enough to fetch in full. */
export function listTrainerNotes(): Promise<TrainerNote[]> {
  return apiFetch<TrainerNote[]>('/connection/notes/')
}

export function createTrainerNote(data: NewTrainerNote): Promise<TrainerNote> {
  return apiFetch<TrainerNote>('/connection/notes/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function markNoteRead(id: number): Promise<TrainerNote> {
  return apiFetch<TrainerNote>(`/connection/notes/${id}/mark_read/`, { method: 'POST' })
}
