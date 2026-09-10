import { apiFetch } from './client'
import type { NewQAThread, QAThread, QAThreadStatus } from './types'

/** Every thread the requester can see - own threads for a trainee, all of
 * their trainees' threads for a trainer. Small enough at Stage 1 scale to
 * fetch in full and filter/sort client-side (archived-hiding, per-trainee). */
export function listQAThreads(): Promise<QAThread[]> {
  return apiFetch<QAThread[]>('/connection/threads/')
}

export function createQAThread(data: NewQAThread): Promise<QAThread> {
  return apiFetch<QAThread>('/connection/threads/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateQAThreadStatus(id: number, status: QAThreadStatus): Promise<QAThread> {
  return apiFetch<QAThread>(`/connection/threads/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
