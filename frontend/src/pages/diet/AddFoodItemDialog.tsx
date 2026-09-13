import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { createFoodItem, listDietaryTags, listMacroFilters, updateFoodItem } from '../../api/foodItems'
import type { DietaryTag, FoodItem, FoodItemKind, FoodItemServingUnit, FoodItemVisibility, MacroFilter } from '../../api/types'
import IngredientPicker, { type DraftComponent } from './IngredientPicker'
import { FIXED_GRAMS_PER_UNIT, SERVING_UNIT_NOUN, SERVING_UNIT_OPTIONS } from '@/lib/servingUnits'
import MultiSelectDropdown from '@/components/MultiSelectDropdown'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { round } from '@/lib/utils'

type AddFoodItemDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (item: FoodItem) => void
  // Set when this dialog is nested inside IngredientPicker's "Add a new ingredient" -
  // an ingredient is always a single item, so the Type toggle has nothing to offer.
  singleItemOnly?: boolean
  // Set to edit an existing food item in place instead of creating a new one.
  item?: FoodItem
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

function servingCaption(unit: FoodItemServingUnit, sizeGrams: string) {
  if (unit === 'g') return 'Per 100g'
  const grams = sizeGrams.trim() ? ` (${sizeGrams}g)` : ''
  return `Per ${SERVING_UNIT_NOUN[unit]}${grams}`
}

export default function AddFoodItemDialog({
  open,
  onOpenChange,
  onCreated,
  singleItemOnly,
  item,
}: AddFoodItemDialogProps) {
  const isEditing = item !== undefined
  const { user } = useAuth()
  const [macroFilters, setMacroFilters] = useState<MacroFilter[]>([])
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>([])
  const [name, setName] = useState('')
  const [kind, setKind] = useState<FoodItemKind>('single')
  const [visibility, setVisibility] = useState<FoodItemVisibility>(user?.is_trainer ? 'public' : 'private')
  const [servingUnit, setServingUnit] = useState<FoodItemServingUnit>('g')
  const [servingSizeGrams, setServingSizeGrams] = useState('')
  const [values, setValues] = useState(EMPTY_VALUES)
  const [showMicros, setShowMicros] = useState(false)
  const [components, setComponents] = useState<DraftComponent[]>([])
  const [selectedMacroFilters, setSelectedMacroFilters] = useState<string[]>([])
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName('')
    setKind('single')
    setVisibility(user?.is_trainer ? 'public' : 'private')
    setServingUnit('g')
    setServingSizeGrams('')
    setValues(EMPTY_VALUES)
    setShowMicros(false)
    setComponents([])
    setSelectedMacroFilters([])
    setSelectedDietaryTags([])
    setError(null)
  }

  function prefillFrom(existing: FoodItem) {
    const basisGrams = existing.serving_unit === 'g' ? 100 : Number(existing.serving_size_grams ?? 100)
    setName(existing.name)
    setKind(existing.kind)
    setVisibility(existing.visibility)
    setServingUnit(existing.serving_unit)
    setServingSizeGrams(existing.serving_size_grams ?? '')
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
  }, [open, item])

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function handleUnitChange(unit: FoodItemServingUnit) {
    setServingUnit(unit)
    const fixed = FIXED_GRAMS_PER_UNIT[unit]
    setServingSizeGrams(fixed !== undefined ? String(fixed) : '')
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
    if (servingUnit !== 'g' && (!servingSizeGrams.trim() || Number(servingSizeGrams) <= 0)) {
      setError(`Enter how many grams equal 1 ${SERVING_UNIT_NOUN[servingUnit]}.`)
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

    const basisGrams = servingUnit === 'g' ? 100 : Number(servingSizeGrams)

    const payload = {
      name: name.trim(),
      kind,
      visibility,
      serving_unit: servingUnit,
      serving_size_grams: servingUnit === 'g' ? null : servingSizeGrams,
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

  // Single item only - right after Type, since the unit applies to the macro values
  // entered right below. Multiple ingredients has no equivalent: each ingredient gets
  // its own unit + amount inside IngredientPicker, so there's nothing left for an
  // overall recipe-level unit to mean.
  const measurementFields = (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor="serving-unit">Measurement</Label>
        <Select value={servingUnit} onValueChange={(v) => handleUnitChange(v as FoodItemServingUnit)}>
          <SelectTrigger id="serving-unit" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SERVING_UNIT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {servingUnit !== 'g' && (
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="serving-size-grams">Grams per {SERVING_UNIT_NOUN[servingUnit]}</Label>
          <Input
            id="serving-size-grams"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={servingSizeGrams}
            onChange={(e) => setServingSizeGrams(e.target.value)}
            required
          />
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

          {kind === 'single' ? (
            <>
              {measurementFields}
              <p className="text-xs text-muted-foreground">{servingCaption(servingUnit, servingSizeGrams)}</p>
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
