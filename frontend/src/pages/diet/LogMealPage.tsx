import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Info, Plus, ScanBarcode, Search, X } from 'lucide-react'
import { ApiError } from '@/api/client'
import { getDietPlan, listDietPlans } from '@/api/dietPlan'
import { getFoodItem, listFoodItems } from '@/api/foodItems'
import { listLoggedMeals, saveLoggedMeal } from '@/api/loggedMeals'
import { listQuickLogItems } from '@/api/quickLogItems'
import type {
  DietPlanDetail,
  FoodItem,
  LoggedMeal,
  NewLoggedMealItem,
  Nutrients,
  QuickLogItem,
  ReferenceMealDetail,
  ReferenceMealItemDetail,
} from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { availableUnits, gramsForQuantity } from '@/lib/servingUnits'
import { nutrientsForWeight, scaleNutrients, sumNutrients } from '@/lib/nutrients'
import { cn, round } from '@/lib/utils'
import { toDateKey } from '@/lib/date'
import AddFoodItemDialog from './AddFoodItemDialog'
import AddQuickLogItemDialog from './AddQuickLogItemDialog'
import BarcodeScannerDialog from './BarcodeScannerDialog'
import NutritionFactsDialog from './NutritionFactsDialog'

type Tab = 'plan' | 'mine' | 'bank'

type PlanCartItem = {
  kind: 'plan'
  key: string
  referenceMealItemId: number
  name: string
  measures: ReferenceMealItemDetail['food_item_measures']
  referenceWeightGrams: number
  referenceNutrients: Nutrients
  unit: string
  quantity: string
}
type FoodCartItem = { kind: 'food'; key: string; foodItem: FoodItem; unit: string; quantity: string }
type QuickCartItem = { kind: 'quick'; key: string; quickLogItem: QuickLogItem }
type CartItem = PlanCartItem | FoodCartItem | QuickCartItem

function planCartItem(item: ReferenceMealItemDetail, quantity?: string): PlanCartItem {
  return {
    kind: 'plan',
    key: `plan-${item.id}`,
    referenceMealItemId: item.id,
    name: item.food_item_name,
    measures: item.food_item_measures,
    referenceWeightGrams: Number(item.reference_weight_grams),
    referenceNutrients: item.reference_nutrients,
    unit: 'g',
    quantity: quantity ?? item.reference_weight_grams,
  }
}

function foodCartItem(foodItem: FoodItem, quantity = ''): FoodCartItem {
  return { kind: 'food', key: `food-${foodItem.id}`, foodItem, unit: 'g', quantity }
}

function quickCartItem(quickLogItem: QuickLogItem): QuickCartItem {
  return { kind: 'quick', key: `quick-${quickLogItem.id}-${Math.random().toString(36).slice(2)}`, quickLogItem }
}

/** Fixed per-serving values, not scaled by weight - mirrors the backend's
 * FoodLog._compute_nutrients for source=quick. */
function quickLogNutrients(q: QuickLogItem): Nutrients {
  return {
    calories: Number(q.calories),
    protein_g: q.protein_g !== null ? Number(q.protein_g) : null,
    carbs_g: q.carbs_g !== null ? Number(q.carbs_g) : null,
    fat_g: q.fat_g !== null ? Number(q.fat_g) : null,
    fiber_g: q.fiber_g !== null ? Number(q.fiber_g) : null,
    sugar_g: q.sugar_g !== null ? Number(q.sugar_g) : null,
    sodium_mg: q.sodium_mg !== null ? Number(q.sodium_mg) : null,
    potassium_mg: null,
    calcium_mg: null,
    iron_mg: null,
    vitamin_c_mg: null,
    vitamin_a_mcg: null,
  }
}

function cartItemNutrients(row: CartItem): Nutrients {
  if (row.kind === 'plan') {
    const grams = gramsForQuantity({ measures: row.measures }, row.unit, row.quantity)
    return grams !== null ? scaleNutrients(row.referenceNutrients, row.referenceWeightGrams, grams) : sumNutrients([])
  }
  if (row.kind === 'food') {
    const grams = gramsForQuantity(row.foodItem, row.unit, row.quantity)
    return grams !== null ? nutrientsForWeight(row.foodItem, grams) : sumNutrients([])
  }
  return quickLogNutrients(row.quickLogItem)
}

function cartItemName(row: CartItem): string {
  if (row.kind === 'plan') return row.name
  if (row.kind === 'food') return row.foodItem.name
  return row.quickLogItem.name
}

function formatDateLabel(date: string) {
  const isToday = date === toDateKey(new Date())
  if (isToday) return 'Today'
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function LogMealPage() {
  const { date = '', mealId = '' } = useParams()
  const navigate = useNavigate()
  const referenceMealId = Number(mealId)

  const [plan, setPlan] = useState<DietPlanDetail | null>(null)
  const [existingLoggedMeal, setExistingLoggedMeal] = useState<LoggedMeal | null>(null)
  const [quickItems, setQuickItems] = useState<QuickLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [cart, setCart] = useState<CartItem[]>([])
  const hydrated = useRef(false)

  const [tab, setTab] = useState<Tab>('plan')
  const [selectedOptionId, setSelectedOptionId] = useState<number | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [bankResults, setBankResults] = useState<FoodItem[]>([])
  const [addFoodOpen, setAddFoodOpen] = useState(false)
  const [addQuickOpen, setAddQuickOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState('')
  const [detailRow, setDetailRow] = useState<{ name: string; caption: string; nutrients: Nutrients } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      listDietPlans().then((plans) => (plans.length ? getDietPlan(plans[0].id) : null)),
      listLoggedMeals(date),
      listQuickLogItems(),
    ])
      .then(([planDetail, loggedMeals, quick]) => {
        if (cancelled) return
        setPlan(planDetail)
        setExistingLoggedMeal(loggedMeals.find((m) => m.reference_meal === referenceMealId) ?? null)
        setQuickItems(quick)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, referenceMealId])

  const meal: ReferenceMealDetail | undefined = plan?.meals.find((m) => m.id === referenceMealId)
  const options = useMemo(() => [...(meal?.options ?? [])].sort((a, b) => a.order - b.order), [meal])

  useEffect(() => {
    if (options.length && selectedOptionId === undefined) setSelectedOptionId(options[0].id)
  }, [options, selectedOptionId])

  // Seed the cart from whatever was already logged, exactly once - a mixed-
  // source LoggedMeal's items may be plan, food-bank, or quick-log rows, and a
  // food-bank row only carries a FoodItem id, so it needs its own fetch.
  useEffect(() => {
    if (hydrated.current || !meal || loading) return
    hydrated.current = true
    if (!existingLoggedMeal) return

    const allPlanItems = new Map<number, ReferenceMealItemDetail>()
    for (const opt of meal.options) for (const item of opt.items) allPlanItems.set(item.id, item)

    Promise.all(
      existingLoggedMeal.items.map(async (item): Promise<CartItem | null> => {
        if (item.reference_meal_item) {
          const source = allPlanItems.get(item.reference_meal_item)
          return source ? planCartItem(source, item.actual_weight_grams ?? undefined) : null
        }
        if (item.quick_log_item) {
          const known = quickItems.find((q) => q.id === item.quick_log_item)
          if (known) return quickCartItem(known)
          // The shortcut itself was since deleted - fall back to the snapshot.
          const n = item.actual_nutrients
          return quickCartItem({
            id: item.quick_log_item,
            name: item.food_item_name,
            calories: String(n.calories ?? 0),
            protein_g: n.protein_g !== null ? String(n.protein_g) : null,
            carbs_g: n.carbs_g !== null ? String(n.carbs_g) : null,
            fat_g: n.fat_g !== null ? String(n.fat_g) : null,
            fiber_g: n.fiber_g !== null ? String(n.fiber_g) : null,
            sugar_g: n.sugar_g !== null ? String(n.sugar_g) : null,
            sodium_mg: n.sodium_mg !== null ? String(n.sodium_mg) : null,
            created_at: '',
          })
        }
        if (item.food_item) {
          const foodItem = await getFoodItem(item.food_item)
          return foodCartItem(foodItem, item.actual_weight_grams ?? '')
        }
        return null
      }),
    ).then((rows) => setCart(rows.filter((r): r is CartItem => r !== null)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meal, loading, existingLoggedMeal, quickItems])

  // Food Bank results: only fetched once something's typed - with the Food Bank
  // covering USDA's full catalog (millions of items), an eager empty-search
  // "default list" would just be a meaningless alphabetical wall of branded
  // products, not something worth browsing. Matches IngredientPicker's pattern.
  useEffect(() => {
    if (!query.trim()) {
      setBankResults([])
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      listFoodItems({ search: query, pageSize: 20 }).then((data) => {
        if (!cancelled) setBankResults(data.results)
      })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const cartHasPlan = (id: number) => cart.some((r) => r.kind === 'plan' && r.referenceMealItemId === id)
  const cartHasFood = (id: number) => cart.some((r) => r.kind === 'food' && r.foodItem.id === id)

  function togglePlanItem(item: ReferenceMealItemDetail) {
    setCart((prev) =>
      cartHasPlan(item.id)
        ? prev.filter((r) => !(r.kind === 'plan' && r.referenceMealItemId === item.id))
        : [...prev, planCartItem(item)],
    )
  }

  function toggleFoodItem(item: FoodItem) {
    setCart((prev) =>
      cartHasFood(item.id) ? prev.filter((r) => !(r.kind === 'food' && r.foodItem.id === item.id)) : [...prev, foodCartItem(item)],
    )
  }

  function addQuickItem(item: QuickLogItem) {
    setCart((prev) => [...prev, quickCartItem(item)])
  }

  function showPlanItemInfo(item: ReferenceMealItemDetail) {
    setDetailRow({
      name: item.food_item_name,
      caption: `Per serving (${item.reference_weight_grams}g)`,
      nutrients: item.reference_nutrients,
    })
  }

  function showQuickItemInfo(item: QuickLogItem) {
    setDetailRow({ name: item.name, caption: 'Fixed serving', nutrients: quickLogNutrients(item) })
  }

  function showFoodItemInfo(item: FoodItem) {
    setDetailRow({ name: item.name, caption: 'Per 100g', nutrients: nutrientsForWeight(item, 100) })
  }

  function removeCartItem(key: string) {
    setCart((prev) => prev.filter((r) => r.key !== key))
  }

  function updateCartQuantity(key: string, patch: { unit?: string; quantity?: string }) {
    setCart((prev) =>
      prev.map((r) => (r.key === key && r.kind !== 'quick' ? { ...r, ...patch } : r)) as CartItem[],
    )
  }

  const totalNutrients = useMemo(() => sumNutrients(cart.map(cartItemNutrients)), [cart])

  const trimmedQuery = query.trim()
  const searching = trimmedQuery.length > 0

  const matchingPlanItems = useMemo(() => {
    if (!searching || !meal) return []
    const seen = new Set<number>()
    const rows: ReferenceMealItemDetail[] = []
    for (const opt of meal.options) {
      for (const item of opt.items) {
        if (seen.has(item.id)) continue
        if (item.food_item_name.toLowerCase().includes(trimmedQuery.toLowerCase())) {
          seen.add(item.id)
          rows.push(item)
        }
      }
    }
    return rows
  }, [searching, meal, trimmedQuery])

  const matchingQuickItems = useMemo(
    () => (searching ? quickItems.filter((q) => q.name.toLowerCase().includes(trimmedQuery.toLowerCase())) : []),
    [searching, quickItems, trimmedQuery],
  )

  async function handleSave() {
    setError(null)
    if (cart.length === 0) {
      setError('Add at least one item before saving.')
      return
    }
    const items: NewLoggedMealItem[] = []
    for (const row of cart) {
      if (row.kind === 'quick') {
        items.push({ quick_log_item: row.quickLogItem.id })
        continue
      }
      const grams =
        row.kind === 'plan'
          ? gramsForQuantity({ measures: row.measures }, row.unit, row.quantity)
          : gramsForQuantity(row.foodItem, row.unit, row.quantity)
      if (grams === null) {
        setError(`Enter a valid amount for ${cartItemName(row)}.`)
        return
      }
      items.push(
        row.kind === 'plan'
          ? { reference_meal_item: row.referenceMealItemId, actual_weight_grams: String(grams) }
          : { food_item: row.foodItem.id, actual_weight_grams: String(grams) },
      )
    }
    setSaving(true)
    try {
      await saveLoggedMeal({ reference_meal: referenceMealId, date, items })
      navigate('/diet/log')
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 403 ? "Only the trainee can log their own meals." : 'Could not save this meal.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  if (loadError || !plan) return <p className="mt-6 text-center text-sm text-muted-foreground">Couldn't load your diet plan.</p>
  if (!meal) return <p className="mt-6 text-center text-sm text-muted-foreground">That meal couldn't be found.</p>

  const selectedOption = options.find((o) => o.id === selectedOptionId) ?? options[0]

  return (
    <div className="-mx-4 flex flex-col gap-3">
      <div
        className="sticky z-10 flex items-center gap-2 border-b border-border bg-background px-4 pb-3 pt-1"
        style={{ top: 'calc(var(--header-height) + env(safe-area-inset-top))' }}
      >
        <Button type="button" variant="ghost" size="icon" aria-label="Back to Log" onClick={() => navigate('/diet/log')}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{meal.label}</span>
          <span className="text-xs text-muted-foreground">{formatDateLabel(date)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="h-8 shrink-0 rounded-full px-3 text-sm" aria-label="Items added">
            {cart.length}
          </Badge>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search plan, my meals, food bank…"
              className="rounded-full pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save all'}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {cart.length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
            <span className="text-xs font-semibold text-muted-foreground">Added so far</span>
            <div className="flex flex-col gap-2">
              {cart.map((row) => {
                const nutrients = cartItemNutrients(row)
                return (
                  <div key={row.key} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={row.kind === 'quick' ? 'secondary' : 'outline'} className="shrink-0">
                          {row.kind === 'plan' ? 'Plan' : row.kind === 'quick' ? 'My meal' : 'Food bank'}
                        </Badge>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{cartItemName(row)}</span>
                      </div>
                      {row.kind !== 'quick' ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.1"
                            className="h-8 w-20"
                            value={row.quantity}
                            onChange={(e) => updateCartQuantity(row.key, { quantity: e.target.value })}
                          />
                          <Select value={row.unit} onValueChange={(v) => updateCartQuantity(row.key, { unit: v })}>
                            <SelectTrigger className="h-8 w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableUnits(row.kind === 'plan' ? { measures: row.measures } : row.foodItem).map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="whitespace-nowrap text-xs text-muted-foreground">
                            {nutrients.calories !== null ? `${round(nutrients.calories)} kcal` : '—'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          1 serving · {nutrients.calories !== null ? `${round(nutrients.calories)} kcal` : '—'}
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${cartItemName(row)}`}
                      onClick={() => removeCartItem(row.key)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
            <div className="flex items-baseline justify-between gap-2 border-t border-border pt-2 text-sm">
              <span className="font-medium">{totalNutrients.calories !== null ? round(totalNutrients.calories) : '—'} kcal</span>
              <span className="flex gap-3 text-muted-foreground">
                <span>P {totalNutrients.protein_g !== null ? round(totalNutrients.protein_g) : '—'}g</span>
                <span>C {totalNutrients.carbs_g !== null ? round(totalNutrients.carbs_g) : '—'}g</span>
                <span>F {totalNutrients.fat_g !== null ? round(totalNutrients.fat_g) : '—'}g</span>
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-1 rounded-full bg-muted p-1">
          {(['plan', 'mine', 'bank'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t)
                setQuery('')
              }}
              className={cn(
                'flex-1 rounded-full py-1.5 text-center text-xs font-semibold transition-colors',
                tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
              )}
            >
              {t === 'plan' ? 'From plan' : t === 'mine' ? 'My meals' : 'Food bank'}
            </button>
          ))}
        </div>

        {searching ? (
          <div className="flex flex-col gap-3">
            {matchingPlanItems.length > 0 && (
              <BrowseSection title="Plan">
                {matchingPlanItems.map((item) => (
                  <BrowseListItem
                    key={item.id}
                    name={item.food_item_name}
                    caption={`${item.reference_weight_grams}g`}
                    added={cartHasPlan(item.id)}
                    onToggle={() => togglePlanItem(item)}
                    onInfo={() => showPlanItemInfo(item)}
                  />
                ))}
              </BrowseSection>
            )}
            {matchingQuickItems.length > 0 && (
              <BrowseSection title="My meals">
                {matchingQuickItems.map((item) => (
                  <BrowseListItem
                    key={item.id}
                    name={item.name}
                    caption={`${item.calories} kcal`}
                    added={false}
                    onToggle={() => addQuickItem(item)}
                    onInfo={() => showQuickItemInfo(item)}
                  />
                ))}
              </BrowseSection>
            )}
            {bankResults.length > 0 && (
              <BrowseSection title="Food bank">
                {bankResults.map((item) => (
                  <BrowseListItem
                    key={item.id}
                    name={item.name}
                    caption={`${item.calories_per_100g} kcal/100g`}
                    added={cartHasFood(item.id)}
                    onToggle={() => toggleFoodItem(item)}
                    onInfo={() => showFoodItemInfo(item)}
                  />
                ))}
              </BrowseSection>
            )}
            {matchingPlanItems.length === 0 && matchingQuickItems.length === 0 && bankResults.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No matches for "{trimmedQuery}".</p>
            )}
          </div>
        ) : (
          <>
            {tab === 'plan' && (
              <div className="flex flex-col gap-2">
                {options.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {options.map((option, index) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedOptionId(option.id)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs font-medium',
                          option.id === selectedOptionId
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border text-muted-foreground',
                        )}
                      >
                        {String.fromCharCode(65 + index)}) {option.label}
                      </button>
                    ))}
                  </div>
                )}
                {selectedOption && (
                  <ul className="flex flex-col overflow-hidden rounded-lg border border-border">
                    {selectedOption.items.map((item) => (
                      <BrowseListItem
                        key={item.id}
                        name={item.food_item_name}
                        caption={`${item.reference_weight_grams}g`}
                        added={cartHasPlan(item.id)}
                        onToggle={() => togglePlanItem(item)}
                        onInfo={() => showPlanItemInfo(item)}
                      />
                    ))}
                  </ul>
                )}
                {!options.length && <p className="text-sm text-muted-foreground">This meal has no plan options yet.</p>}
              </div>
            )}

            {tab === 'mine' && (
              <div className="flex flex-col gap-2">
                <ul className="flex flex-col overflow-hidden rounded-lg border border-border">
                  {quickItems.map((item) => (
                    <BrowseListItem
                      key={item.id}
                      name={item.name}
                      caption={`${item.calories} kcal`}
                      added={false}
                      addLabel="Add"
                      onToggle={() => addQuickItem(item)}
                      onInfo={() => showQuickItemInfo(item)}
                    />
                  ))}
                </ul>
                {quickItems.length === 0 && (
                  <p className="text-sm text-muted-foreground">No saved shortcuts yet - add one below.</p>
                )}
                <Button type="button" variant="link" className="h-auto justify-start px-0" onClick={() => setAddQuickOpen(true)}>
                  <Plus className="size-3.5" /> New quick-log shortcut
                </Button>
              </div>
            )}

            {tab === 'bank' && (
              <div className="flex flex-col gap-2">
                {bankResults.length > 0 && (
                  <ul className="flex flex-col overflow-hidden rounded-lg border border-border">
                    {bankResults.map((item) => (
                      <BrowseListItem
                        key={item.id}
                        name={item.name}
                        caption={`${item.calories_per_100g} kcal/100g`}
                        added={cartHasFood(item.id)}
                        onToggle={() => toggleFoodItem(item)}
                        onInfo={() => showFoodItemInfo(item)}
                      />
                    ))}
                  </ul>
                )}
                {bankResults.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {query.trim() ? 'No foods found.' : 'Search the food bank…'}
                  </p>
                )}
                <Button type="button" variant="link" className="h-auto justify-start px-0" onClick={() => setAddFoodOpen(true)}>
                  <Plus className="size-3.5" /> Add a new food item
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Button
        type="button"
        size="icon-lg"
        className="fixed z-15 rounded-full shadow-lg"
        style={{ right: 16, bottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom) + 16px)' }}
        onClick={() => setScannerOpen(true)}
        aria-label="Scan a barcode"
      >
        <ScanBarcode className="size-6" />
      </Button>

      <AddFoodItemDialog
        open={addFoodOpen}
        onOpenChange={(next) => {
          setAddFoodOpen(next)
          if (!next) setScannedBarcode('')
        }}
        onCreated={(item) => toggleFoodItem(item)}
        initialName={scannedBarcode ? '' : trimmedQuery}
        initialBarcode={scannedBarcode || undefined}
      />
      <AddQuickLogItemDialog open={addQuickOpen} onOpenChange={setAddQuickOpen} onCreated={(item) => { setQuickItems((prev) => [item, ...prev]); addQuickItem(item) }} initialName={trimmedQuery} />
      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onFound={(item) => toggleFoodItem(item)}
        onNotFound={(barcode) => {
          setScannedBarcode(barcode)
          setAddFoodOpen(true)
        }}
      />
      <NutritionFactsDialog
        open={detailRow !== null}
        onOpenChange={(next) => !next && setDetailRow(null)}
        name={detailRow?.name ?? ''}
        caption={detailRow?.caption ?? ''}
        nutrients={detailRow?.nutrients ?? sumNutrients([])}
      />
    </div>
  )
}

function BrowseSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{title}</span>
      <ul className="flex flex-col overflow-hidden rounded-lg border border-border">{children}</ul>
    </div>
  )
}

function BrowseListItem({
  name,
  caption,
  added,
  addLabel,
  onToggle,
  onInfo,
}: {
  name: string
  caption: string
  added: boolean
  addLabel?: string
  onToggle: () => void
  // Opens a nutrition-facts popup for this item - omitted (e.g. no case has come up
  // yet) rather than shown disabled, same as elsewhere in the app's info-icon pattern.
  onInfo?: () => void
}) {
  return (
    <li className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm">{name}</span>
        <span className="text-xs text-muted-foreground">{caption}</span>
      </div>
      {onInfo && (
        <button
          type="button"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onInfo}
          aria-label={`View nutrition for ${name}`}
        >
          <Info className="size-4" />
        </button>
      )}
      <Button type="button" size="sm" variant={added ? 'secondary' : 'outline'} onClick={onToggle}>
        {added ? 'Added' : (addLabel ?? 'Add')}
      </Button>
    </li>
  )
}
