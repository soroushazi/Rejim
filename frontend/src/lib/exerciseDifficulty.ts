import type { ExerciseDifficulty } from '@/api/types'

export const DIFFICULTY_LABEL: Record<ExerciseDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export const DIFFICULTY_BADGE_VARIANT: Record<ExerciseDifficulty, 'secondary' | 'outline' | 'default'> = {
  beginner: 'secondary',
  intermediate: 'outline',
  advanced: 'default',
}
