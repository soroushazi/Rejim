import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { listFoodItems } from '../../api/foodItems'
import type { FoodItem } from '../../api/types'
import FoodItemCard from './FoodItemCard'
import AddFoodItemDialog from './AddFoodItemDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function FoodBankPage() {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<FoodItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      listFoodItems(search)
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
  }, [search])

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
            <FoodItemCard key={item.id} item={item} onUpdated={handleUpdated} />
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
    </div>
  )
}
