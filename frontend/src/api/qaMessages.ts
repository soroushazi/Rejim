import { apiFetch } from './client'
import type { NewQAMessage, QAMessage } from './types'

export function listQAMessages(threadId: number): Promise<QAMessage[]> {
  return apiFetch<QAMessage[]>(`/connection/messages/?thread=${threadId}`)
}

export function sendQAMessage(data: NewQAMessage): Promise<QAMessage> {
  return apiFetch<QAMessage>('/connection/messages/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
