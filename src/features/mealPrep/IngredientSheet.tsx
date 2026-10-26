import { Search } from 'lucide-react'
import { useId, useState } from 'react'
import { useFoodSearch, useRecentFoods, type FoodListItem } from '@/features/foods/api'
import { cx } from '@/lib/cx'
import { formatKcal } from '@/lib/format'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { Sheet } from '@/ui'
import { focusRing, pressable } from '@/ui/styles'

const SEARCH_DEBOUNCE_MS = 250

type IngredientSheetProps = {
  open: boolean
  onClose: () => void
  onPick: (food: FoodListItem) => void
}

/** HU-17 CA2: picks a raw ingredient with the same search as Agregar. */
export function IngredientSheet({ open, onClose, onPick }: IngredientSheetProps) {
  const [query, setQuery] = useState('')
  const term = query.trim()
  const debouncedTerm = useDebouncedValue(term, SEARCH_DEBOUNCE_MS)
  const searchId = useId()

  const close = () => {
    setQuery('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={close} title="Agregar ingrediente">
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          Buscar ingrediente
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-5 size-6 -translate-y-1/2 text-accent"
        />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar ingrediente crudo"
          autoComplete="off"
          enterKeyHint="search"
          className={cx(
            'h-14 w-full rounded-pill border border-surface-2 bg-surface pr-5 pl-14 text-base font-bold text-on-surface placeholder:text-on-surface-muted',
            focusRing,
          )}
        />
      </div>
      <div className="mt-4 max-h-[50dvh] overflow-y-auto">
        {open && (
          <Results
            term={debouncedTerm}
            onPick={(food) => {
              setQuery('')
              onPick(food)
            }}
          />
        )}
      </div>
    </Sheet>
  )
}

function Results({ term, onPick }: { term: string; onPick: (food: FoodListItem) => void }) {
  const search = useFoodSearch(term)
  const recent = useRecentFoods(term === '')

  const foods = term === '' ? recent.data : search.data
  const loading = term === '' ? recent.isPending : search.isPending || search.isPlaceholderData
  let status: string
  if (foods && foods.length > 0) status = term === '' ? 'Recientes' : `${foods.length} resultados`
  else if (loading) status = 'Buscando…'
  else if (term === '') status = 'Escribe para buscar'
  else status = `No encontramos “${term}”`

  return (
    <section aria-label="Ingredientes">
      <p aria-live="polite" className="mb-2 px-1 text-sm font-bold text-ink-soft">
        {status}
      </p>
      {foods && foods.length > 0 && (
        <ul className="space-y-2">
          {foods.map((food) => (
            <li key={food.id}>
              <button
                type="button"
                onClick={() => onPick(food)}
                className={cx(
                  'flex min-h-14 w-full items-center justify-between gap-3 rounded-card border border-surface-2 bg-surface px-4 py-2 text-left text-on-surface',
                  focusRing,
                  pressable,
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-extrabold">{food.name}</span>
                  {food.brand && (
                    <span className="block truncate text-sm font-semibold text-on-surface-muted">
                      {food.brand}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm font-semibold text-on-surface-muted">
                  {formatKcal(food.per100.kcal)} kcal / 100 {food.basis}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
