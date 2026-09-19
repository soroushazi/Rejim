import { apiFetch } from './client'
import type { NewTrainerNote, TrainerNote } from './types'

/** Every note the requester can see - own notes for a trainee, all of their
 * trainees' notes for a trainer (or just one trainee's with `traineeId`, for
 * the trainer-dashboard Notes composer). Small enough to fetch in full. */
export function listTrainerNotes(traineeId?: number): Promise<TrainerNote[]> {
  return apiFetch<TrainerNote[]>(`/connection/notes/${traineeId ? `?trainee_id=${traineeId}` : ''}`)
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

export function archiveTrainerNote(id: number): Promise<TrainerNote> {
  return apiFetch<TrainerNote>(`/connection/notes/${id}/archive/`, { method: 'POST' })
}

export function unarchiveTrainerNote(id: number): Promise<TrainerNote> {
  return apiFetch<TrainerNote>(`/connection/notes/${id}/unarchive/`, { method: 'POST' })
}

/** Trainer-only, permanent - see connection.views.TrainerNoteViewSet (a plain
 * ModelViewSet; delete was already permitted server-side, just never exposed
 * from the frontend until now). */
export function deleteTrainerNote(id: number): Promise<void> {
  return apiFetch<void>(`/connection/notes/${id}/`, { method: 'DELETE' })
}
