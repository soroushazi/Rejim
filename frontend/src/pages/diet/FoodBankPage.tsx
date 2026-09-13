import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  createFoodItemEditRequest,
  listDietaryTags,
  listFoodItemEditRequests,
  listFoodItems,
  listMacroFilters,
  resolveFoodItemEditRequest,
} from '../../api/foodItems'
import type { DietaryTag, FoodItem, FoodItemEditRequest, MacroFilter } from '../../api/types'
import FoodItemCard from './FoodItemCard'
import AddFoodItemDialog from './AddFoodItemDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import MultiSelectDropdown from '@/components/MultiSelectDropdown'
import RequestEditDialog from '@/components/RequestEditDialog'

export default function FoodBankPage() {
  const [search, setSearch] = useState('')
  const [macroFilters, setMacroFilters] = useState<MacroFilter[]>([])
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>([])
  const [selectedMacroFilters, setSelectedMacroFilters] = useState<string[]>([])
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<string[]>([])
  const [items, setItems] = useState<FoodItem[]>([])
  const [editRequests, setEditRequests] = useState<FoodItemEditRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null)
  const [requestEditItem, setRequestEditItem] = useState<FoodItem | null>(null)

  useEffect(() => {
    listMacroFilters()
      .then(setMacroFilters)
      .catch(() => {})
    listDietaryTags()
      .then(setDietaryTags)
      .catch(() => {})
    listFoodItemEditRequests()
      .then(setEditRequests)
      .catch(() => {})
  }, [])

  const editRequestsByItem = useMemo(() => {
    const map = new Map<number, FoodItemEditRequest[]>()
    for (const req of editRequests) {
      const list = map.get(req.food_item)
      if (list) list.push(req)
      else map.set(req.food_item, [req])
    }
    return map
  }, [editRequests])

  async function handleRequestEditSubmit(description: string) {
    if (!requestEditItem) return
    const created = await createFoodItemEditRequest({ food_item: requestEditItem.id, description })
    setEditRequests((prev) => [created, ...prev])
  }

  async function handleResolveRequest(id: number) {
    const updated = await resolveFoodItemEditRequest(id)
    setEditRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      listFoodItems({
        search,
        macroFilterIds: selectedMacroFilters.map(Number),
        dietaryTagIds: selectedDietaryTags.map(Number),
      })
        .then((data) => {
          if (!cancelled) {
            setItems(data)
            setError(false)
          }
        })
        .catch(() => {
          if (!cancelled) setError(true)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, selectedMacroFilters, selectedDietaryTags])

  function handleUpdated(updated: FoodItem) {
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
  }

  return (
    <div
      className="relative flex flex-col gap-3"
      style={{
        minHeight:
          'calc(100svh - var(--header-height) - 92px - var(--nav-height) - env(safe-area-inset-bottom))',
      }}
    >
      <Input
        type="search"
        placeholder="Search food bank…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="rounded-full"
      />

      {(macroFilters.length > 0 || dietaryTags.length > 0) && (
        <div className="flex gap-2">
          {macroFilters.length > 0 && (
            <MultiSelectDropdown
              label="Category"
              options={macroFilters}
              selected={selectedMacroFilters}
              onChange={setSelectedMacroFilters}
              className="flex-1"
            />
          )}
          {dietaryTags.length > 0 && (
            <MultiSelectDropdown
              label="Tags"
              options={dietaryTags}
              selected={selectedDietaryTags}
              onChange={setSelectedDietaryTags}
              className="flex-1"
            />
          )}
        </div>
      )}

      {loading && <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>}
      {!loading && error && (
        <p className="mt-6 text-center text-sm text-muted-foreground">Couldn't load the food bank.</p>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">No foods found.</p>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <FoodItemCard
              key={item.id}
              item={item}
              macroFilters={macroFilters}
              dietaryTags={dietaryTags}
              editRequests={editRequestsByItem.get(item.id) ?? []}
              onUpdated={handleUpdated}
              onEdit={() => setEditingItem(item)}
              onRequestEdit={() => setRequestEditItem(item)}
              onResolveRequest={handleResolveRequest}
            />
          ))}
        </ul>
      )}

      <Button
        type="button"
        size="icon-lg"
        className="fixed z-15 rounded-full shadow-lg"
        style={{ right: 16, bottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom) + 16px)' }}
        onClick={() => setAddOpen(true)}
        aria-label="Add food"
      >
        <Plus className="size-6" />
      </Button>

      <AddFoodItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(item) => setItems((prev) => [item, ...prev])}
      />

      <AddFoodItemDialog
        open={editingItem !== null}
        onOpenChange={(open) => !open && setEditingItem(null)}
        item={editingItem ?? undefined}
        onCreated={(item) => {
          handleUpdated(item)
          setEditingItem(null)
        }}
      />

      <RequestEditDialog
        open={requestEditItem !== null}
        onOpenChange={(open) => !open && setRequestEditItem(null)}
        itemName={requestEditItem?.name ?? ''}
        onSubmit={handleRequestEditSubmit}
      />
    </div>
  )
}
