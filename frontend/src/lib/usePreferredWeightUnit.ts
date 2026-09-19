import { useEffect, useState } from 'react'
import { getPreferences } from '@/api/preferences'
import type { User, WeightUnit } from '@/api/types'

/** The display-unit preference for body/lifting weight (kg/lb) that Progress
 * charts should render in. Pass the trainee being viewed (from useTraineeId)
 * when in trainer view mode - a trainer should see a trainee's weights in
 * *that trainee's* preference, not their own, so this reads straight off the
 * already-fetched User record (see UserSerializer.default_weight_unit)
 * instead of hitting /preferences/, which is always scoped to the caller.
 * Omit it (or pass null/undefined) when viewing your own data, which falls
 * back to fetching your own preference. Defaults to 'kg' until resolved. */
export function usePreferredWeightUnit(trainee?: User | null): WeightUnit {
  const [ownUnit, setOwnUnit] = useState<WeightUnit>('kg')

  useEffect(() => {
    if (trainee) return
    getPreferences()
      .then((p) => setOwnUnit(p.default_weight_unit))
      .catch(() => {})
  }, [trainee])

  return trainee ? trainee.default_weight_unit : ownUnit
}
