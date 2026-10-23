import { ChevronLeft, Clock, Search, SearchX, Star, UtensilsCrossed } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import type { Meal } from '@/domain/meal'
import { cx } from '@/lib/cx'
import { MEALS } from '@/lib/meals'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { useGoBack } from '@/lib/useGoBack'
import { Button, Chip, EmptyState, FoodRow, IconButton, Segmented } from '@/ui'
import { focusRing, pressable } from '@/ui/styles'
import { useFavoriteFoods, useFoodSearch, useMyFoods, type FoodListItem } from './api'
import { defaultServing } from './serving'
import { useMealParam } from './useMealParam'

/** HU-04 CA3: "unos 250 ms". */
const SEARCH_DEBOUNCE_MS = 250

type Tab = 'recent' | 'favorites' | 'mine'

const TABS: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: 'recent', label: 'Recientes' },
  { value: 'favorites', label: 'Favoritos' },
  { value: 'mine', label: 'Mis alimentos' },
]

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

  function openFood(food: FoodListItem) {
    void navigate(`/foods/${food.id}?meal=${meal}`)
  }

  const term = query.trim()
  // Here and not in SearchResults: that one mounts with the first letter, which
  // would then be searched right away instead of waiting.
  const debouncedTerm = useDebouncedValue(term, SEARCH_DEBOUNCE_MS)

  return (
    <main className="mx-auto min-h-dvh max-w-md space-y-4 px-4 py-6">
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

      <SearchField value={query} onChange={(value) => setParam('q', value)} />

      {term === '' ? (
        <>
          <Segmented
            label="Listas de alimentos"
            tone="subtle"
            options={TABS}
            value={tab}
            onChange={(value) => setParam('tab', value === 'recent' ? '' : value)}
          />
          {tab === 'recent' && <RecentTab />}
          {tab === 'favorites' && <FavoritesTab onSelect={openFood} />}
          {tab === 'mine' && <MyFoodsTab meal={meal} onSelect={openFood} />}
        </>
      ) : (
        <SearchResults term={term} debouncedTerm={debouncedTerm} meal={meal} onSelect={openFood} />
      )}
    </main>
  )
}

function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
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
          'h-14 w-full rounded-pill border border-surface-2 bg-surface pr-5 pl-14 text-base font-bold text-on-surface placeholder:text-on-surface-muted',
          focusRing,
        )}
      />
    </div>
  )
}

function SearchResults({
  term,
  debouncedTerm,
  meal,
  onSelect,
}: {
  term: string
  debouncedTerm: string
  meal: Meal
  onSelect: (food: FoodListItem) => void
}) {
  const search = useFoodSearch(debouncedTerm)
  // Still typing, or the results on screen belong to an earlier query.
  const settled = debouncedTerm === term && !search.isPlaceholderData

  let content: ReactNode
  let status: string
  if (search.data && !(settled && search.data.length === 0)) {
    content = <FoodList foods={search.data} onSelect={onSelect} />
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
        description="Revisa cómo lo escribiste, o créalo con los datos de su etiqueta."
        action={<CreateFoodLink meal={meal} name={term} />}
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

/** HU-09 from Agregar alimento, keeping the meal and what the user searched for. */
function CreateFoodLink({ meal, name }: { meal: Meal; name?: string }) {
  const params = new URLSearchParams({ meal })
  if (name) params.set('name', name)
  return (
    <Link
      to={`/foods/new?${params.toString()}`}
      className={cx(
        'inline-flex h-11 items-center justify-center rounded-pill bg-surface px-5 font-extrabold text-on-surface',
        focusRing,
        pressable,
      )}
    >
      Crear alimento
    </Link>
  )
}

function resultsStatus(count: number) {
  return count === 1 ? '1 resultado' : `${count} resultados`
}

function RecentTab() {
  // recent_foods arrives with food_logs (L-1). Until then nobody has logged anything.
  return (
    <EmptyState
      icon={<Clock aria-hidden="true" />}
      title="Aún no registras comidas"
      description="Lo que agregues aparecerá aquí para repetirlo rápido."
    />
  )
}

function FavoritesTab({ onSelect }: { onSelect: (food: FoodListItem) => void }) {
  const favorites = useFavoriteFoods(true)
  return (
    <ListState
      query={favorites}
      onSelect={onSelect}
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

function MyFoodsTab({ meal, onSelect }: { meal: Meal; onSelect: (food: FoodListItem) => void }) {
  const mine = useMyFoods(true)
  return (
    <ListState
      query={mine}
      onSelect={onSelect}
      empty={
        <EmptyState
          icon={<UtensilsCrossed aria-hidden="true" />}
          title="Aún no creas alimentos"
          description="Los alimentos que crees aparecerán aquí."
          action={<CreateFoodLink meal={meal} />}
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
  onSelect,
  empty,
}: {
  query: ListQuery
  onSelect: (food: FoodListItem) => void
  empty: ReactNode
}) {
  if (query.data) {
    return query.data.length === 0 ? empty : <FoodList foods={query.data} onSelect={onSelect} />
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

function FoodList({
  foods,
  onSelect,
}: {
  foods: FoodListItem[]
  onSelect: (food: FoodListItem) => void
}) {
  return (
    <ul className="space-y-2">
      {foods.map((food) => {
        const serving = defaultServing(food)
        return (
          <li key={food.id}>
            {/* The "+" for the 2-tap add (HU-04 CA4) comes with food_logs (L-3). */}
            <FoodRow
              name={food.brand ? `${food.name} · ${food.brand}` : food.name}
              portion={serving.label}
              kcal={serving.kcal}
              onSelect={() => onSelect(food)}
            />
          </li>
        )
      })}
    </ul>
  )
}
