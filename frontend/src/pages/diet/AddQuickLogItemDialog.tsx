import { useEffect, useState, type FormEvent } from 'react'
import { createQuickLogItem } from '@/api/quickLogItems'
import type { NewQuickLogItem, QuickLogItem } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (item: QuickLogItem) => void
  // Seeds every field when opening - either just a searched name (the empty-
  // Food-Bank-search "Add..." link) or a full draft handed over from
  // AddCustomMealDialog's "head to my meals" link, which carries over
  // whatever the trainee had already typed there.
  initialValues?: Partial<NewQuickLogItem>
}

const MACRO_FIELDS: { key: keyof NewQuickLogItem; label: string }[] = [
  { key: 'protein_g', label: 'Protein (g)' },
  { key: 'carbs_g', label: 'Carbs (g)' },
  { key: 'fat_g', label: 'Fat (g)' },
]

const MICRO_FIELDS: { key: keyof NewQuickLogItem; label: string }[] = [
  { key: 'fiber_g', label: 'Fiber (g)' },
  { key: 'sugar_g', label: 'Sugar (g)' },
  { key: 'sodium_mg', label: 'Sodium (mg)' },
  { key: 'potassium_mg', label: 'Potassium (mg)' },
  { key: 'calcium_mg', label: 'Calcium (mg)' },
  { key: 'iron_mg', label: 'Iron (mg)' },
  { key: 'vitamin_c_mg', label: 'Vitamin C (mg)' },
  { key: 'vitamin_a_mcg', label: 'Vitamin A (mcg)' },
]

const VALUE_FIELDS = [...MACRO_FIELDS, ...MICRO_FIELDS]

function valuesFrom(initialValues: Partial<NewQuickLogItem> | undefined): Record<string, string> {
  return Object.fromEntries(VALUE_FIELDS.map(({ key }) => [key, initialValues?.[key] ?? ''])) as Record<
    string,
    string
  >
}

/** A trainee's shortcut for something with fixed nutrition per serving (e.g. "my
 * protein shake") - logged as a single fixed-value item, no weight/amount entry.
 * See nutrition/models.py::QuickLogItem. */
export default function AddQuickLogItemDialog({ open, onOpenChange, onCreated, initialValues }: Props) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [calories, setCalories] = useState(initialValues?.calories ?? '')
  const [values, setValues] = useState(valuesFrom(initialValues))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName(initialValues?.name ?? '')
    setCalories(initialValues?.calories ?? '')
    setValues(valuesFrom(initialValues))
    setError(null)
  }

  useEffect(() => {
    if (open) reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues])

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !calories.trim()) {
      setError('Name and calories are required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const created = await createQuickLogItem({
        name: name.trim(),
        calories: calories.trim(),
        ...Object.fromEntries(VALUE_FIELDS.map(({ key }) => [key, values[key]?.trim() || null])),
      })
      onCreated(created)
      handleOpenChange(false)
    } catch {
      setError('Could not save this shortcut.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New quick-log shortcut</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            A fixed-value shortcut for something you log as-is (e.g. "Protein shake") - no weight or amount needed,
            just the nutrition for one serving.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-log-name">Name</Label>
            <Input id="quick-log-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-log-calories">Calories (kcal)</Label>
            <Input
              id="quick-log-calories"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {MACRO_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <Label htmlFor={`quick-log-${key}`}>{label}</Label>
                <Input
                  id={`quick-log-${key}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={values[key]}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <p className="text-xs font-semibold text-muted-foreground">Micronutrients (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            {MICRO_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <Label htmlFor={`quick-log-${key}`}>{label}</Label>
                <Input
                  id={`quick-log-${key}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={values[key]}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
