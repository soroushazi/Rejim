import { apiFetch } from './client'
import type { NewTrainerPrivateNote, TrainerPrivateNote } from './types'

export function listTrainerPrivateNotes(traineeId: number): Promise<TrainerPrivateNote[]> {
  return apiFetch<TrainerPrivateNote[]>(`/connection/private-notes/?trainee_id=${traineeId}`)
}

export function createTrainerPrivateNote(data: NewTrainerPrivateNote): Promise<TrainerPrivateNote> {
  return apiFetch<TrainerPrivateNote>('/connection/private-notes/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
