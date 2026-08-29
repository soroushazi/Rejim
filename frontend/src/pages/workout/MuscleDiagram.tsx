import { useEffect, useRef } from 'react'
import createBodyHighlighter, { type Muscle, type ModelType } from 'body-highlighter'

// body-highlighter's own alias resolver only catches near-exact spelling
// (singular/plural), not the common gym synonyms our freeform MuscleGroup
// names use ("Traps" -> trapezius, "Lats" -> upper-back, "Glutes" -> gluteal,
// ...) - confirmed by testing it directly. A handful of our broader/vaguer
// names (Arms, Back, Full Body, Hip Flexors, Legs - only used by a few
// Cardio/functional exercises) have no good single-muscle match and are
// intentionally left unmapped, so they simply don't highlight anything.
const MUSCLE_SLUG_MAP: Record<string, Muscle> = {
  Adductors: 'adductor', // body-highlighter's own naming quirk: the ABDUCTOR key's value is "adductor"
  Biceps: 'biceps',
  Brachialis: 'biceps',
  Calves: 'calves',
  Chest: 'chest',
  Core: 'abs',
  Forearms: 'forearm',
  'Front Deltoids': 'front-deltoids',
  Glutes: 'gluteal',
  Hamstrings: 'hamstring',
  Lats: 'upper-back',
  'Lower Back': 'lower-back',
  'Mid Back': 'upper-back',
  Obliques: 'obliques',
  Quadriceps: 'quadriceps',
  'Rear Deltoids': 'back-deltoids',
  'Rotator Cuff': 'back-deltoids',
  Shoulders: 'front-deltoids',
  'Side Deltoids': 'front-deltoids',
  Traps: 'trapezius',
  Triceps: 'triceps',
  'Upper Back': 'upper-back',
  'Upper Chest': 'chest',
}

function toSlugs(names: string[]): Muscle[] {
  const slugs = names.map((n) => MUSCLE_SLUG_MAP[n]).filter((s): s is Muscle => s !== undefined)
  return [...new Set(slugs)]
}

type Props = {
  primaryMuscles: string[]
  secondaryMuscles: string[]
  type: ModelType
}

export default function MuscleDiagram({ primaryMuscles, secondaryMuscles, type }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const data = [
      { name: 'primary', muscles: toSlugs(primaryMuscles), frequency: 2 },
      { name: 'secondary', muscles: toSlugs(secondaryMuscles), frequency: 1 },
    ].filter((d) => d.muscles.length > 0)

    const instance = createBodyHighlighter({
      container: containerRef.current,
      data,
      type,
      bodyColor: 'var(--muted)',
      highlightedColors: ['#c9b3e0', '#4c236b'],
      style: { width: '100%', maxWidth: '9rem' },
    })
    return () => instance.destroy()
  }, [primaryMuscles, secondaryMuscles, type])

  return <div ref={containerRef} className="flex justify-center" />
}
