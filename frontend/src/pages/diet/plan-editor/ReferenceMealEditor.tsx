import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  createMealOption,
  createReferenceMealItem,
  deleteMealOption,
  deleteReferenceMeal,
  deleteReferenceMealItem,
  updateMealOption,
} from '@/api/dietPlan'
import type { MealOptionDetail, ReferenceMealDetail } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import IngredientPicker, { type DraftComponent } from '../IngredientPicker'

function MealOptionEditor({
  option,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onChanged,
}: {
  option: MealOptionDetail
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onChanged: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [label, setLabel] = useState(option.label)
  const [draft, setDraft] = useState<DraftComponent[]>(
    option.items.map((item) => ({ ingredient: item.food_item, name: item.food_item_name, weight_grams: item.reference_weight_grams })),
  )
  const [saving, setSaving] = useState(false)

  async function saveLabel() {
    setSaving(true)
    try {
      await updateMealOption(option.id, { label })
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  async function saveIngredients() {
    setSaving(true)
    try {
      // Always send the complete current state (delete-all, recreate) - same
      // "full replace" convention LoggedMealSerializer/WorkoutSessionSerializer
      // already use elsewhere in this app, simpler than diffing.
      await Promise.all(option.items.map((item) => deleteReferenceMealItem(item.id)))
      await Promise.all(
        draft
          .filter((d) => d.weight_grams.trim())
          .map((d) => createReferenceMealItem({ option: option.id, food_item: d.ingredient, reference_weight_grams: d.weight_grams })),
      )
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  async function removeOption() {
    if (!window.confirm(`Delete option '${option.label}'?`)) return
    await deleteMealOption(option.id)
    onChanged()
  }

  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <div className="flex flex-col">
            <button type="button" disabled={isFirst} onClick={onMoveUp} className="disabled:opacity-30">
              <ChevronUp className="size-3.5" />
            </button>
            <button type="button" disabled={isLast} onClick={onMoveDown} className="disabled:opacity-30">
              <ChevronDown className="size-3.5" />
            </button>
          </div>
          <button type="button" className="truncate text-left text-sm font-medium" onClick={() => setExpanded((v) => !v)}>
            {option.label} ({option.items.length} ingredients)
          </button>
        </div>
        <button type="button" onClick={removeOption} aria-label="Remove option">
          <Trash2 className="size-4 text-destructive" />
        </button>
      </div>

      {expanded && (
        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
          <div className="flex items-center gap-1.5">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Option label" className="flex-1" />
            <Button type="button" size="sm" disabled={saving} onClick={saveLabel}>
              Rename
            </Button>
          </div>
          <IngredientPicker value={draft} onChange={setDraft} visibility="public" />
          <Button type="button" size="sm" className="w-fit" disabled={saving} onClick={saveIngredients}>
            {saving ? 'Saving…' : 'Save ingredients'}
          </Button>
        </div>
      )}
    </div>
  )
}

type Props = {
  meal: ReferenceMealDetail
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onChanged: () => void
}

export default function ReferenceMealEditor({ meal, isFirst, isLast, onMoveUp, onMoveDown, onChanged }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [addingOption, setAddingOption] = useState(false)
  const [newOptionLabel, setNewOptionLabel] = useState('')
  const [saving, setSaving] = useState(false)

  async function removeMeal() {
    if (!window.confirm(`Delete meal '${meal.label}'? This removes all its options too.`)) return
    await deleteReferenceMeal(meal.id)
    onChanged()
  }

  async function handleAddOption() {
    if (!newOptionLabel.trim()) return
    setSaving(true)
    try {
      await createMealOption({ meal: meal.id, label: newOptionLabel.trim(), order: meal.options.length })
      setNewOptionLabel('')
      setAddingOption(false)
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  async function moveOption(index: number, direction: -1 | 1) {
    const target = meal.options[index + direction]
    const current = meal.options[index]
    if (!target) return
    await Promise.all([
      updateMealOption(current.id, { order: target.order }),
      updateMealOption(target.id, { order: current.order }),
    ])
    onChanged()
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex flex-col">
            <button type="button" disabled={isFirst} onClick={onMoveUp} className="disabled:opacity-30">
              <ChevronUp className="size-4" />
            </button>
            <button type="button" disabled={isLast} onClick={onMoveDown} className="disabled:opacity-30">
              <ChevronDown className="size-4" />
            </button>
          </div>
          <button type="button" className="truncate text-left font-semibold" onClick={() => setExpanded((v) => !v)}>
            {meal.label} ({meal.options.length} option{meal.options.length === 1 ? '' : 's'})
          </button>
        </div>
        <button type="button" onClick={removeMeal} aria-label="Delete meal">
          <Trash2 className="size-4 text-destructive" />
        </button>
      </CardHeader>
      {expanded && (
        <CardContent className="flex flex-col gap-2">
          {meal.options.map((option, i) => (
            <MealOptionEditor
              key={option.id}
              option={option}
              isFirst={i === 0}
              isLast={i === meal.options.length - 1}
              onMoveUp={() => moveOption(i, -1)}
              onMoveDown={() => moveOption(i, 1)}
              onChanged={onChanged}
            />
          ))}

          {addingOption ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={newOptionLabel}
                onChange={(e) => setNewOptionLabel(e.target.value)}
                placeholder="Option label, e.g. Smoothie"
                className="flex-1"
              />
              <Button type="button" size="sm" disabled={saving || !newOptionLabel.trim()} onClick={handleAddOption}>
                {saving ? 'Adding…' : 'Add'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAddingOption(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setAddingOption(true)}>
              <Plus className="size-4" />
              Add option
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  )
}
