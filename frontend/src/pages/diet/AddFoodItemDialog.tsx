import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { createFoodItem, listDietaryTags, listMacroFilters, updateFoodItem } from '../../api/foodItems'
import type { DietaryTag, FoodItem, FoodItemKind, FoodItemVisibility, MacroFilter } from '../../api/types'
import IngredientPicker, { type DraftComponent } from './IngredientPicker'
import { defaultMeasure } from '@/lib/servingUnits'
import MultiSelectDropdown from '@/components/MultiSelectDropdown'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn, round } from '@/lib/utils'

type AddFoodItemDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (item: FoodItem) => void
  // Set when this dialog is nested inside IngredientPicker's "Add a new ingredient" -
  // an ingredient is always a single item, so the Type toggle has nothing to offer.
  singleItemOnly?: boolean
  // Set to edit an existing food item in place instead of creating a new one.
  item?: FoodItem
  // Seeds the Name field when opening to create (e.g. from a Food Bank search that had no results).
  initialName?: string
}

const MACRO_FIELDS: { key: string; label: string }[] = [
  { key: 'calories_per_100g', label: 'Calories (kcal)' },
  { key: 'protein_g_per_100g', label: 'Protein (g)' },
  { key: 'carbs_g_per_100g', label: 'Carbs (g)' },
  { key: 'fat_g_per_100g', label: 'Fat (g)' },
]

const MICRO_FIELDS: { key: string; label: string }[] = [
  { key: 'fiber_g_per_100g', label: 'Fiber (g)' },
  { key: 'sugar_g_per_100g', label: 'Sugar (g)' },
  { key: 'sodium_mg_per_100g', label: 'Sodium (mg)' },
  { key: 'potassium_mg_per_100g', label: 'Potassium (mg)' },
  { key: 'calcium_mg_per_100g', label: 'Calcium (mg)' },
  { key: 'iron_mg_per_100g', label: 'Iron (mg)' },
  { key: 'vitamin_c_mg_per_100g', label: 'Vitamin C (mg)' },
  { key: 'vitamin_a_mcg_per_100g', label: 'Vitamin A (mcg)' },
]

const EMPTY_VALUES = Object.fromEntries(
  [...MACRO_FIELDS, ...MICRO_FIELDS].map(({ key }) => [key, '']),
) as Record<string, string>

type DraftMeasure = { label: string; grams_per_unit: string; is_default: boolean }

// 'g' = enter nutrition values per 100g (the canonical, always-available basis); a
// number indexes into the draft `measures` list below, for entering values per one
// of this item's own named units instead (e.g. "per tbsp" for a packaged label).
type EntryBasis = 'g' | number

export default function AddFoodItemDialog({
  open,
  onOpenChange,
  onCreated,
  singleItemOnly,
  item,
  initialName,
}: AddFoodItemDialogProps) {
  const isEditing = item !== undefined
  const { user } = useAuth()
  const [macroFilters, setMacroFilters] = useState<MacroFilter[]>([])
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>([])
  const [name, setName] = useState('')
  const [kind, setKind] = useState<FoodItemKind>('single')
  const [visibility, setVisibility] = useState<FoodItemVisibility>(user?.is_trainer ? 'public' : 'private')
  const [measures, setMeasures] = useState<DraftMeasure[]>([])
  const [entryBasis, setEntryBasis] = useState<EntryBasis>('g')
  const [values, setValues] = useState(EMPTY_VALUES)
  const [showMicros, setShowMicros] = useState(false)
  const [components, setComponents] = useState<DraftComponent[]>([])
  const [selectedMacroFilters, setSelectedMacroFilters] = useState<string[]>([])
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName(initialName ?? '')
    setKind('single')
    setVisibility(user?.is_trainer ? 'public' : 'private')
    setMeasures([])
    setEntryBasis('g')
    setValues(EMPTY_VALUES)
    setShowMicros(false)
    setComponents([])
    setSelectedMacroFilters([])
    setSelectedDietaryTags([])
    setError(null)
  }

  function prefillFrom(existing: FoodItem) {
    const measure = defaultMeasure(existing)
    const basisGrams = measure ? Number(measure.grams_per_unit) : 100
    setName(existing.name)
    setKind(existing.kind)
    setVisibility(existing.visibility)
    setMeasures(existing.measures.map((m) => ({ label: m.label, grams_per_unit: m.grams_per_unit, is_default: m.is_default })))
    setEntryBasis(measure ? existing.measures.findIndex((m) => m.is_default) : 'g')
    setValues(
      Object.fromEntries(
        [...MACRO_FIELDS, ...MICRO_FIELDS].map(({ key }) => {
          const raw = existing[key as keyof FoodItem] as string | null
          if (raw === null || raw === undefined) return [key, '']
          return [key, String(round((Number(raw) * basisGrams) / 100))]
        }),
      ) as Record<string, string>,
    )
    setShowMicros(MICRO_FIELDS.some(({ key }) => existing[key as keyof FoodItem]))
    setComponents(
      existing.components.map((c) => ({ ingredient: c.ingredient, name: c.ingredient_name, weight_grams: c.weight_grams })),
    )
    setSelectedMacroFilters(existing.macro_filters.map(String))
    setSelectedDietaryTags(existing.dietary_tags.map(String))
    setError(null)
  }

  useEffect(() => {
    if (!open) return
    listMacroFilters()
      .then(setMacroFilters)
      .catch(() => {})
    listDietaryTags()
      .then(setDietaryTags)
      .catch(() => {})
    if (item) prefillFrom(item)
    else reset()
  }, [open, item, initialName])

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function addMeasureRow() {
    setMeasures((rows) => [...rows, { label: '', grams_per_unit: '', is_default: rows.length === 0 }])
  }

  function updateMeasureRow(index: number, patch: Partial<DraftMeasure>) {
    setMeasures((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function setDefaultMeasureRow(index: number) {
    setMeasures((rows) => rows.map((row, i) => ({ ...row, is_default: i === index })))
  }

  function removeMeasureRow(index: number) {
    setMeasures((rows) => rows.filter((_, i) => i !== index))
    setEntryBasis((basis) => (basis === index ? 'g' : typeof basis === 'number' && basis > index ? basis - 1 : basis))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // This dialog can be nested inside itself (IngredientPicker's "Add a new
    // ingredient" opens one from within another already-open instance). React
    // bubbles events through the React tree, not the DOM tree, so without this a
    // submit here would also fire the outer instance's handleSubmit even though
    // its form isn't a real DOM ancestor (it's portaled).
    e.stopPropagation()
    setError(null)

    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    if (measures.some((m) => !m.label.trim() || !m.grams_per_unit.trim() || Number(m.grams_per_unit) <= 0)) {
      setError('Enter a label and a positive gram amount for every measure, or remove it.')
      return
    }
    const measureLabels = measures.map((m) => m.label.trim().toLowerCase())
    if (new Set(measureLabels).size !== measureLabels.length) {
      setError('Measure labels must be unique.')
      return
    }
    if (kind === 'single') {
      const missing = MACRO_FIELDS.find(({ key }) => values[key].trim() === '')
      if (missing) {
        setError('Calories, protein, carbs, and fat are required.')
        return
      }
    } else {
      if (components.length === 0) {
        setError('Add at least one ingredient.')
        return
      }
      if (components.some((c) => c.weight_grams.trim() === '')) {
        setError('Enter a weight for every ingredient.')
        return
      }
    }

    const basisGrams = entryBasis === 'g' ? 100 : Number(measures[entryBasis].grams_per_unit)

    const payload = {
      name: name.trim(),
      kind,
      visibility,
      measures: measures.map((m) => ({
        label: m.label.trim(),
        grams_per_unit: m.grams_per_unit,
        is_default: m.is_default,
      })),
      macro_filters: selectedMacroFilters.map(Number),
      dietary_tags: selectedDietaryTags.map(Number),
      ...(kind === 'single'
        ? Object.fromEntries(
            [...MACRO_FIELDS, ...MICRO_FIELDS].map(({ key }) => [
              key,
              values[key].trim() === '' ? null : ((Number(values[key]) * 100) / basisGrams).toFixed(2),
            ]),
          )
        : {}),
      ...(kind === 'composite'
        ? { components: components.map(({ ingredient, weight_grams }) => ({ ingredient, weight_grams })) }
        : {}),
    }

    setSubmitting(true)
    try {
      // Editing never touches barcode (this form has no field for it) - only a
      // fresh create sends barcode: null, so an edit can't blank out a seeded
      // item's real barcode.
      const saved = isEditing ? await updateFoodItem(item.id, payload) : await createFoodItem({ ...payload, barcode: null })
      onCreated(saved)
      handleOpenChange(false)
    } catch {
      setError('Could not save this food item. Check the values and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Named, food-specific units this item can be logged in (e.g. "tbsp", "whole
  // (thigh)"), on top of the always-available g/oz/lb. Available for both single and
  // composite items, since it's about how a trainee logs it, not how the nutrition
  // values were entered.
  const measuresEditor = (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label>Measures (optional)</Label>
        <Button type="button" variant="link" className="h-auto px-0" onClick={addMeasureRow}>
          Add measure
        </Button>
      </div>
      {measures.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Add named units this can be logged in, like "tbsp" or "whole" - besides grams/oz/lb.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {measures.map((measure, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder="Label (e.g. tbsp)"
                value={measure.label}
                onChange={(e) => updateMeasureRow(index, { label: e.target.value })}
                className="min-w-0 flex-1"
              />
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder="Grams"
                value={measure.grams_per_unit}
                onChange={(e) => updateMeasureRow(index, { grams_per_unit: e.target.value })}
                className="w-20"
              />
              <button
                type="button"
                onClick={() => setDefaultMeasureRow(index)}
                title="Use as the nutrition entry basis below"
                className={cn(
                  'shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium whitespace-nowrap',
                  measure.is_default
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground',
                )}
              >
                Default
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove measure"
                onClick={() => removeMeasureRow(index)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit food' : 'Add food'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="food-name">Name</Label>
            <Input id="food-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          {user?.is_trainer ? (
            <div className="flex flex-col gap-1.5">
              <Label>Visibility</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                value={visibility}
                onValueChange={(v) => v && setVisibility(v as FoodItemVisibility)}
                className="w-full"
              >
                <ToggleGroupItem value="public" className="flex-1">
                  Public
                </ToggleGroupItem>
                <ToggleGroupItem value="trainees" className="flex-1">
                  My Trainees
                </ToggleGroupItem>
              </ToggleGroup>
              <p className="text-xs text-muted-foreground">
                {visibility === 'trainees'
                  ? 'Only visible to your own trainees.'
                  : 'Shared with everyone in the Food Bank.'}
              </p>
            </div>
          ) : (
            user?.is_trainee && (
              <div className="flex flex-col gap-1.5">
                <Label>Visibility</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={visibility}
                  onValueChange={(v) => v && setVisibility(v as FoodItemVisibility)}
                  className="w-full"
                >
                  <ToggleGroupItem value="private" className="flex-1">
                    Private
                  </ToggleGroupItem>
                  <ToggleGroupItem value="public" className="flex-1">
                    Public
                  </ToggleGroupItem>
                </ToggleGroup>
                <p className="text-xs text-muted-foreground">
                  {visibility === 'private'
                    ? 'Only visible to you.'
                    : 'Shared with everyone once a trainer approves it.'}
                </p>
              </div>
            )
          )}

          {!singleItemOnly && (
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                value={kind}
                onValueChange={(v) => v && setKind(v as FoodItemKind)}
                className="w-full"
              >
                <ToggleGroupItem value="single" className="flex-1">
                  Single item
                </ToggleGroupItem>
                <ToggleGroupItem value="composite" className="flex-1">
                  Multiple ingredients
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}

          {measuresEditor}

          {kind === 'single' ? (
            <>
              {measures.length > 0 && (
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label htmlFor="entry-basis">Enter values per</Label>
                  <Select
                    value={entryBasis === 'g' ? 'g' : String(entryBasis)}
                    onValueChange={(v) => setEntryBasis(v === 'g' ? 'g' : Number(v))}
                  >
                    <SelectTrigger id="entry-basis" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">100g</SelectItem>
                      {measures.map((m, index) => (
                        <SelectItem key={index} value={String(index)} disabled={!m.label.trim()}>
                          {m.label.trim() || `Measure ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {entryBasis === 'g'
                  ? 'Values below are per 100g.'
                  : `Values below are per ${measures[entryBasis]?.label || 'unit'} (${measures[entryBasis]?.grams_per_unit || '?'}g).`}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {MACRO_FIELDS.map(({ key, label }) => (
                  <div key={key} className="flex min-w-0 flex-col gap-1.5">
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      value={values[key]}
                      onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                      required
                    />
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="link"
                className="h-auto justify-start px-0"
                onClick={() => setShowMicros((v) => !v)}
              >
                {showMicros ? 'Hide micronutrients' : 'Add micronutrients (optional)'}
              </Button>

              {showMicros && (
                <div className="grid grid-cols-2 gap-3">
                  {MICRO_FIELDS.map(({ key, label }) => (
                    <div key={key} className="flex min-w-0 flex-col gap-1.5">
                      <Label htmlFor={key}>{label}</Label>
                      <Input
                        id={key}
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min="0"
                        value={values[key]}
                        onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <IngredientPicker value={components} onChange={setComponents} />
          )}

          {(macroFilters.length > 0 || dietaryTags.length > 0) && (
            <div className="flex gap-3">
              {macroFilters.length > 0 && (
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Label>Category</Label>
                  <MultiSelectDropdown
                    label="Category"
                    options={macroFilters}
                    selected={selectedMacroFilters}
                    onChange={setSelectedMacroFilters}
                  />
                </div>
              )}
              {dietaryTags.length > 0 && (
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Label>Tags</Label>
                  <MultiSelectDropdown
                    label="Tags"
                    options={dietaryTags}
                    selected={selectedDietaryTags}
                    onChange={setSelectedDietaryTags}
                  />
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Save food item'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
