const CM_PER_INCH = 2.54

/** Height's canonical storage is always height_cm - these are pure conversion
 * helpers for the cm/ft+in entry toggle, an entry/display convenience only. */
export function cmFromFtIn(feet: number, inches: number): number {
  return (feet * 12 + inches) * CM_PER_INCH
}

export function ftInFromCm(cm: number): { feet: number; inches: number } {
  const totalInches = cm / CM_PER_INCH
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round((totalInches - feet * 12) * 10) / 10
  return { feet, inches }
}
