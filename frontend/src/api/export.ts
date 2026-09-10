import { ApiError, getToken } from './client'

export type ExportKind = 'diet-log' | 'workout-log' | 'daily-metrics'

const FILENAME: Record<ExportKind, string> = {
  'diet-log': 'diet-log.csv',
  'workout-log': 'workout-log.csv',
  'daily-metrics': 'daily-metrics.csv',
}

/** Fetches a CSV export and triggers a browser download. A plain <a href>
 * can't attach the Authorization header, so this fetches as a Blob and
 * drives a synthetic <a download> click instead - the standard pattern for
 * authenticated file downloads. */
export async function downloadExport(kind: ExportKind, start: string, end: string): Promise<void> {
  const token = getToken()
  const headers = new Headers()
  if (token) headers.set('Authorization', `Token ${token}`)

  const response = await fetch(`/api/export/${kind}/?start=${start}&end=${end}`, { headers })
  if (!response.ok) {
    const body = await response.text()
    throw new ApiError(response.status, body)
  }
  const blob = await response.blob()

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = FILENAME[kind]
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
