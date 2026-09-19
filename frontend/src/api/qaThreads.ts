import { apiFetch } from './client'
import type { NewQAThread, QAThread, QAThreadStatus } from './types'

/** Every thread the requester can see - own threads for a trainee, all of
 * their trainees' threads for a trainer. Small enough at Stage 1 scale to
 * fetch in full and filter/sort client-side (archived-hiding, per-trainee). */
export function listQAThreads(traineeId?: number): Promise<QAThread[]> {
  const query = traineeId ? `?trainee_id=${traineeId}` : ''
  return apiFetch<QAThread[]>(`/connection/threads/${query}`)
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

/** Call when the thread's own trainee opens it, so the trainer's later
 * replies stop counting toward the Trainer-tab unread badge - see
 * connection.views.QAThreadViewSet.mark_read. A no-op (403, ignored) if
 * called by anyone else, e.g. a trainer viewing their trainee's thread. */
export function markQAThreadRead(id: number): Promise<QAThread> {
  return apiFetch<QAThread>(`/connection/threads/${id}/mark_read/`, { method: 'POST' })
}
