import { apiFetch } from './client'
import type { NewTrainerConnection, TrainerConnection } from './types'

/** null if the trainee hasn't submitted a request yet - the backend returns
 * 204 for that case (apiFetch already maps 204 -> undefined). */
export async function getTrainerConnection(): Promise<TrainerConnection | null> {
  const result = await apiFetch<TrainerConnection | undefined>('/connection/trainer-connection/')
  return result ?? null
}

/** Upserts - a trainee resubmitting before being assigned just replaces
 * their prior request. */
export function submitTrainerConnection(data: NewTrainerConnection): Promise<TrainerConnection> {
  return apiFetch<TrainerConnection>('/connection/trainer-connection/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
