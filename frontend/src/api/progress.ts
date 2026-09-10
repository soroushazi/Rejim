import { apiFetch } from './client'
import type {
  ProgressConsistencyResponse,
  ProgressNutritionResponse,
  ProgressOverviewResponse,
  ProgressRecoveryResponse,
  ProgressTrainingResponse,
  ProgressTrainingVolumeResponse,
} from './types'

export type ProgressRange = { start: string; end: string }

function query(range: ProgressRange, extra?: Record<string, string | number | undefined>) {
  const params = new URLSearchParams({ start: range.start, end: range.end })
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value !== undefined) params.set(key, String(value))
    }
  }
  return params.toString()
}

export function getProgressOverview(range: ProgressRange, traineeId?: number): Promise<ProgressOverviewResponse> {
  return apiFetch<ProgressOverviewResponse>(`/progress/overview/?${query(range, { trainee_id: traineeId })}`)
}

export function getProgressTraining(
  range: ProgressRange,
  traineeId?: number,
  exerciseId?: number,
): Promise<ProgressTrainingResponse> {
  return apiFetch<ProgressTrainingResponse>(
    `/progress/training/?${query(range, { trainee_id: traineeId, exercise_id: exerciseId })}`,
  )
}

export function getProgressTrainingVolume(
  range: ProgressRange,
  traineeId?: number,
): Promise<ProgressTrainingVolumeResponse> {
  return apiFetch<ProgressTrainingVolumeResponse>(`/progress/training-volume/?${query(range, { trainee_id: traineeId })}`)
}

export function getProgressNutrition(range: ProgressRange, traineeId?: number): Promise<ProgressNutritionResponse> {
  return apiFetch<ProgressNutritionResponse>(`/progress/nutrition/?${query(range, { trainee_id: traineeId })}`)
}

export function getProgressRecovery(range: ProgressRange, traineeId?: number): Promise<ProgressRecoveryResponse> {
  return apiFetch<ProgressRecoveryResponse>(`/progress/recovery/?${query(range, { trainee_id: traineeId })}`)
}

export function getProgressConsistency(
  range: ProgressRange,
  traineeId?: number,
): Promise<ProgressConsistencyResponse> {
  return apiFetch<ProgressConsistencyResponse>(`/progress/consistency/?${query(range, { trainee_id: traineeId })}`)
}
