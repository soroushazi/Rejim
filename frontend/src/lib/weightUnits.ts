import type { WeightUnit } from '@/api/types'

const LB_TO_KG = 0.45359237

/** Mirrors the backend's progress/services.py::to_kg - the client-side
 * counterpart needed wherever a kg/lb-tagged value (e.g. a Goal's target)
 * has to be compared against/plotted alongside an already-kg value. */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? value * LB_TO_KG : value
}

export function fromKg(valueKg: number, unit: WeightUnit): number {
  return unit === 'lb' ? valueKg / LB_TO_KG : valueKg
}
