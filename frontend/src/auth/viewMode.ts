import type { User } from '@/api/types'

export type ViewMode = 'trainer' | 'trainee'

/** The one source of truth for "given this account and which entry point they
 * used, which dashboard do they land in." Matching flag -> that dashboard.
 * Wrong door (or no `requestedAs` at all, e.g. a plain page reload) -> silent
 * correction to whichever capability the account actually has, trainer
 * winning when both are true and there's no explicit request either way. */
export function resolveViewMode(user: User, requestedAs?: 'trainer'): ViewMode {
  if (requestedAs === 'trainer' && user.is_trainer) return 'trainer'
  if (requestedAs !== 'trainer' && user.is_trainee) return 'trainee'
  return user.is_trainer ? 'trainer' : 'trainee'
}
