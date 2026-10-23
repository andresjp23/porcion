import {
  ChevronLeft,
  Clock,
  Plus,
  ScanBarcode,
  Search,
  SearchX,
  Star,
  UtensilsCrossed,
} from 'lucide-react'
import { useCallback, useId, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { nutrientsForGrams } from '@/domain/nutrition'
import { useAddLog } from '@/features/today/api'
import { useLogDate } from '@/features/today/useLogDate'
import { cx } from '@/lib/cx'
import { MEALS } from '@/lib/meals'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { useGoBack } from '@/lib/useGoBack'
import {
  Button,
  buttonClasses,
  Chip,
  EmptyState,
  FoodRow,
  IconButton,
  Segmented,
  Toast,
} from '@/ui'
import { focusRing, pressable } from '@/ui/styles'
import {
  useFavoriteFoods,
  useFoodSearch,
  useMyFoods,
  useRecentFoods,
  type FoodListItem,
} from './api'
import { defaultServing, foodDisplayName } from './serving'
import { useMealParam } from './useMealParam'

/** HU-04 CA3: "unos 250 ms". */
const SEARCH_DEBOUNCE_MS = 250

type Tab = 'recent' | 'favorites' | 'mine'

const TABS: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: 'recent', label: 'Recientes' },
  { value: 'favorites', label: 'Favoritos' },
  { value: 'mine', label: 'Mis alimentos' },
]

/** What a row of any list can do: open the Detail, or log it in 2 taps. */
type FoodActions = {
  open: (food: FoodListItem) => void
  add: (food: FoodListItem) => void
  /** Link to Crear alimento, keeping the meal and the day. */
  createHref: (name?: string) => string
  /** Link to the scanner (HU-08), keeping the meal and the day. */
  scanHref: string
}

function parseTab(value: string | null): Tab {
  return TABS.find((tab) => tab.value === value)?.value ?? 'recent'
}

/**
 * Agregar alimento (HU-04). The meal, the query and the tab live in the URL,
 * so coming back from the Detail keeps them.
 */
export function AddFoodPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [meal, setMeal] = useMealParam()
  const query = params.get('q') ?? ''
  const tab = parseTab(params.get('tab'))

  function setParam(name: 'q' | 'tab', value: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === '') next.delete(name)
        else next.set(name, value)
        return next
      },
      { replace: true },
    )
  }

  const goBack = useGoBack()
  const { date, isToday } = useLogDate()
  const addLog = useAddLog()
  const [notice, setNotice] = useState<string | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])
  const mealLabel = MEALS.find((m) => m.value === meal)?.label ?? ''

  // The meal and, when it is not today, the day travel with every link.
  function linkParams(extra: Record<string, string> = {}) {
    const next = new URLSearchParams({ meal, ...extra })
    if (!isToday) next.set('date', date)
    return next.toString()
  }

  const actions: FoodActions = {
    open: (food) => void navigate(`/foods/${food.id}?${linkParams()}`),
    // HU-04 CA4: the default portion, without opening the Detail.
    add: (food) => {
      const serving = defaultServing(food)
      const name = foodDisplayName(food)
      addLog.mutate(
        {
          id: crypto.randomUUID(),
          date,
          meal,
          foodId: food.id,
          portionId: food.defaultPortion?.id ?? null,
          quantity: food.defaultPortion ? 1 : serving.grams,
          grams: serving.grams,
          foodName: name,
          nutrients: nutrientsForGrams(food.per100, serving.grams),
        },
        { onError: () => setNotice(`No pudimos agregar ${name}. Inténtalo de nuevo.`) },
      )
      setNotice(`Agregaste ${name} a ${mealLabel}`)
    },
    createHref: (name) => `/foods/new?${linkParams(name ? { name } : {})}`,
    scanHref: `/scan?${linkParams()}`,
  }

  const term = query.trim()
  // Here and not in SearchResults: that one mounts with the first letter, which
  // would then be searched right away instead of waiting.
  const debouncedTerm = useDebouncedValue(term, SEARCH_DEBOUNCE_MS)

  return (
    <main className="mx-auto min-h-dvh max-w-md space-y-4 px-4 pt-6 pb-48">
      <header className="flex items-center gap-3">
        <IconButton
          label="Volver"
          icon={<ChevronLeft aria-hidden="true" />}
          size="lg"
          onClick={goBack}
        />
        <h1 className="text-3xl font-extrabold">¿Qué comiste?</h1>
      </header>

      <div
        role="group"
        aria-label="Comida"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]"
      >
        {MEALS.map((option) => (
          <Chip
            key={option.value}
            selected={option.value === meal}
            onClick={() => setMeal(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>

      <SearchField
        value={query}
        onChange={(value) => setParam('q', value)}
        scanHref={actions.scanHref}
      />

      {term === '' ? (
        <>
          <Segmented
            label="Listas de alimentos"
            tone="subtle"
            options={TABS}
            value={tab}
            onChange={(value) => setParam('tab', value === 'recent' ? '' : value)}
          />
          {tab === 'recent' && <RecentTab actions={actions} />}
          {tab === 'favorites' && <FavoritesTab actions={actions} />}
          {tab === 'mine' && <MyFoodsTab actions={actions} />}
        </>
      ) : (
        <SearchResults term={term} debouncedTerm={debouncedTerm} actions={actions} />
      )}

      {notice && <Toast message={notice} onDismiss={dismissNotice} />}

      {/* Always in sight: scanning (HU-08) and, for a food missing from the
          base, creating it (HU-09). */}
      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md space-y-2">
          <div className="flex items-center justify-between gap-3 rounded-card border border-surface-2 bg-surface py-2 pr-2 pl-4 text-on-surface">
            <p className="text-sm font-bold text-on-surface-muted">
              ¿No encuentras lo que comiste?
            </p>
            <CreateFoodLink href={actions.createHref(term)} />
          </div>
          <Link to={actions.scanHref} className={buttonClasses({ fullWidth: true })}>
            <ScanBarcode aria-hidden="true" className="size-6" />
            Escanear código de barras
          </Link>
        </div>
      </div>
    </main>
  )
}

function SearchField({
  value,
  onChange,
  scanHref,
}: {
  value: string
  onChange: (value: string) => void
  scanHref: string
}) {
  const id = useId()
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        Buscar alimento
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-5 size-6 -translate-y-1/2 text-accent"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar alimento"
        autoComplete="off"
        enterKeyHint="search"
        className={cx(
          'h-14 w-full rounded-pill border border-surface-2 bg-surface pr-16 pl-14 text-base font-bold text-on-surface placeholder:text-on-surface-muted',
          focusRing,
        )}
      />
      <Link
        to={scanHref}
        aria-label="Escanear código de barras"
        className={cx(
          'absolute top-1/2 right-1.5 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface-2 text-accent',
          focusRing,
          pressable,
        )}
      >
        <ScanBarcode aria-hidden="true" className="size-6" />
      </Link>
    </div>
  )
}

function SearchResults({
  term,
  debouncedTerm,
  actions,
}: {
  term: string
  debouncedTerm: string
  actions: FoodActions
}) {
  const search = useFoodSearch(debouncedTerm)
  // Still typing, or the results on screen belong to an earlier query.
  const settled = debouncedTerm === term && !search.isPlaceholderData

  let content: ReactNode
  let status: string
  if (search.data && !(settled && search.data.length === 0)) {
    content = <FoodList foods={search.data} actions={actions} />
    status = settled ? resultsStatus(search.data.length) : 'Buscando…'
  } else if (search.isError) {
    status = 'No pudimos buscar'
    content = (
      <EmptyState
        icon={<SearchX aria-hidden="true" />}
        title="No pudimos buscar"
        description="Revisa tu conexión e inténtalo de nuevo."
        action={
          <Button variant="secondary" onClick={() => void search.refetch()}>
            Reintentar
          </Button>
        }
      />
    )
  } else if (settled && search.data?.length === 0) {
    status = 'Sin resultados'
    content = (
      <EmptyState
        icon={<SearchX aria-hidden="true" />}
        title={`No encontramos “${term}”`}
        description="Revisa cómo lo escribiste, o créalo abajo con los datos de su etiqueta."
      />
    )
  } else {
    status = 'Buscando…'
    content = <p className="px-1 font-semibold text-ink-muted">Buscando…</p>
  }

  return (
    <section aria-label="Resultados">
      <p aria-live="polite" className="sr-only">
        {status}
      </p>
      {content}
    </section>
  )
}

/** HU-09 from Agregar alimento. */
function CreateFoodLink({ href }: { href: string }) {
  return (
    <Link
      to={href}
      className={cx(
        'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-pill bg-accent px-4 font-extrabold text-on-accent',
        focusRing,
        pressable,
      )}
    >
      <Plus aria-hidden="true" className="size-5" />
      Crear alimento
    </Link>
  )
}

function resultsStatus(count: number) {
  return count === 1 ? '1 resultado' : `${count} resultados`
}

function RecentTab({ actions }: { actions: FoodActions }) {
  const recent = useRecentFoods(true)
  return (
    <ListState
      query={recent}
      actions={actions}
      empty={
        <EmptyState
          icon={<Clock aria-hidden="true" />}
          title="Aún no registras comidas"
          description="Lo que agregues aparecerá aquí para repetirlo rápido."
        />
      }
    />
  )
}

function FavoritesTab({ actions }: { actions: FoodActions }) {
  const favorites = useFavoriteFoods(true)
  return (
    <ListState
      query={favorites}
      actions={actions}
      empty={
        <EmptyState
          icon={<Star aria-hidden="true" />}
          title="Aún no tienes favoritos"
          description="Marca un alimento como favorito en su detalle y lo tendrás a mano aquí."
        />
      }
    />
  )
}

function MyFoodsTab({ actions }: { actions: FoodActions }) {
  const mine = useMyFoods(true)
  return (
    <ListState
      query={mine}
      actions={actions}
      empty={
        <EmptyState
          icon={<UtensilsCrossed aria-hidden="true" />}
          title="Aún no creas alimentos"
          description="Los alimentos que crees aparecerán aquí."
        />
      }
    />
  )
}

type ListQuery = {
  data: FoodListItem[] | undefined
  isError: boolean
  refetch: () => Promise<unknown>
}

function ListState({
  query,
  actions,
  empty,
}: {
  query: ListQuery
  actions: FoodActions
  empty: ReactNode
}) {
  if (query.data) {
    return query.data.length === 0 ? empty : <FoodList foods={query.data} actions={actions} />
  }
  if (query.isError) {
    return (
      <EmptyState
        icon={<SearchX aria-hidden="true" />}
        title="No pudimos cargar la lista"
        description="Revisa tu conexión e inténtalo de nuevo."
        action={
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Reintentar
          </Button>
        }
      />
    )
  }
  return <p className="px-1 font-semibold text-ink-muted">Cargando…</p>
}

function FoodList({ foods, actions }: { foods: FoodListItem[]; actions: FoodActions }) {
  return (
    <ul className="space-y-2">
      {foods.map((food) => {
        const serving = defaultServing(food)
        return (
          <li key={food.id}>
            <FoodRow
              name={foodDisplayName(food)}
              portion={serving.label}
              kcal={serving.kcal}
              onSelect={() => actions.open(food)}
              onAdd={() => actions.add(food)}
            />
          </li>
        )
      })}
    </ul>
  )
}
