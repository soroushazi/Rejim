import type { GoalDirection, WeightUnit } from '@/api/types'
import { fromKg, toKg } from './weightUnits'

/** Auto-picks lose/gain/maintain by comparing a typed target weight against
 * the trainee's current weight - so entering "150" when you're 160 doesn't
 * also require separately picking "Lose". */
export function directionFromTarget(targetKg: number, currentKg: number): GoalDirection {
  if (targetKg < currentKg) return 'lose'
  if (targetKg > currentKg) return 'gain'
  return 'maintain'
}

/** The inverse: target weight (in `unit`) implied by wanting to lose/gain
 * `amount` (in `unit`) from the trainee's current weight. */
export function targetWeightFromAmount(
  direction: Exclude<GoalDirection, 'maintain'>,
  amount: number,
  unit: WeightUnit,
  currentKg: number,
): number {
  const amountKg = toKg(amount, unit)
  const targetKg = direction === 'lose' ? currentKg - amountKg : currentKg + amountKg
  return fromKg(targetKg, unit)
}
