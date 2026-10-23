import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft, Plus, SearchX, ShoppingCart, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { localDate } from '@/domain/dates'
import { listProgress, MAX_ITEM_LABEL } from '@/domain/shopping'
import { useFoodSearch } from '@/features/foods/api'
import { foodDisplayName } from '@/features/foods/serving'
import { useTimeZone } from '@/features/profile/useProfile'
import { cx } from '@/lib/cx'
import { formatDay } from '@/lib/format'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { useGoBack } from '@/lib/useGoBack'
import { Button, Card, EmptyState, IconButton, Input, Sheet, Toast } from '@/ui'
import { focusRing, pressable } from '@/ui/styles'
import {
  useActiveList,
  useAddItem,
  useCreateList,
  useFinishList,
  useListHistory,
  useRemoveItem,
  useToggleItem,
  type ShoppingList,
} from './api'

/** Same wait as the search of Agregar alimento (HU-04 CA3). */
const SUGGEST_DEBOUNCE_MS = 250
const MAX_SUGGESTIONS = 4

function progressText(list: Pick<ShoppingList, 'items'>) {
  const { checked, total } = listProgress(list.items)
  return total === 1 ? `${checked} de 1 marcado` : `${checked} de ${total} marcados`
}

/** Lista de compras (HU-11). Optional: the supermarket mode works without one. */
export function ShoppingPage() {
  const goBack = useGoBack('/foods')
  const active = useActiveList()

  return (
    <main className="mx-auto min-h-dvh max-w-md space-y-6 px-4 pt-6 pb-12">
      <header className="flex items-center gap-3">
        <IconButton
          label="Volver"
          icon={<ChevronLeft aria-hidden="true" />}
          size="lg"
          onClick={goBack}
        />
        <h1 className="text-3xl font-extrabold">Lista de compras</h1>
      </header>

      {active.data ? (
        <ActiveList list={active.data} />
      ) : active.data === null ? (
        <NoList />
      ) : active.isError ? (
        <EmptyState
          icon={<SearchX aria-hidden="true" />}
          title="No pudimos cargar tu lista"
          description="Revisa tu conexión e inténtalo de nuevo."
          action={
            <Button variant="secondary" onClick={() => void active.refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : (
        <p className="px-1 font-semibold text-ink-muted">Cargando…</p>
      )}

      <History />
    </main>
  )
}

function NoList() {
  const createList = useCreateList()
  return (
    <EmptyState
      icon={<ShoppingCart aria-hidden="true" />}
      title="Arma tu lista de compras"
      description="Anota lo que necesitas y márcalo mientras compras."
      action={
        <div className="space-y-3">
          <Button
            fullWidth
            disabled={createList.isPending}
            onClick={() => createList.mutate('Compras')}
          >
            Crear lista
          </Button>
          {createList.isError && (
            <p role="alert" className="font-bold text-ink">
              No pudimos crear la lista. Inténtalo de nuevo.
            </p>
          )}
        </div>
      }
    />
  )
}

function ActiveList({ list }: { list: ShoppingList }) {
  const toggleItem = useToggleItem()
  const removeItem = useRemoveItem()
  const [finishing, setFinishing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <section aria-labelledby="active-list" className="space-y-4">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id="active-list" className="text-lg font-extrabold">
          {list.name}
        </h2>
        <p aria-live="polite" className="font-bold text-ink-muted tabular-nums">
          {progressText(list)}
        </p>
      </div>

      <AddItemForm listId={list.id} onError={setNotice} />

      {list.items.length === 0 ? (
        <p className="px-1 font-semibold text-ink-soft">
          Tu lista está vacía. Escribe arriba lo que necesitas comprar.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.items.map((item) => {
            const checked = item.checkedAt !== null
            const label = item.quantity > 1 ? `${item.label} × ${item.quantity}` : item.label
            return (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-card border border-surface-2 bg-surface py-1 pr-2 pl-4 text-on-surface"
              >
                <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      toggleItem.mutate(
                        { id: item.id, checked: event.target.checked },
                        { onError: () => setNotice(`No pudimos marcar ${item.label}.`) },
                      )
                    }
                    className={cx('size-6 shrink-0 rounded accent-accent', focusRing)}
                  />
                  <span
                    className={cx(
                      'font-bold',
                      checked && 'text-on-surface-muted line-through decoration-2',
                    )}
                  >
                    {label}
                  </span>
                </label>
                <IconButton
                  label={`Quitar ${item.label}`}
                  icon={<Trash2 aria-hidden="true" className="size-5" />}
                  variant="subtle"
                  onClick={() =>
                    removeItem.mutate(item.id, {
                      onError: () => setNotice(`No pudimos quitar ${item.label}.`),
                    })
                  }
                />
              </li>
            )
          })}
        </ul>
      )}

      <Button fullWidth variant="ghost" onClick={() => setFinishing(true)}>
        Terminar lista
      </Button>
      <FinishSheet list={list} open={finishing} onClose={() => setFinishing(false)} />
      {notice && <Toast message={notice} onDismiss={() => setNotice(null)} />}
    </section>
  )
}

const itemSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Escribe qué necesitas')
    .max(MAX_ITEM_LABEL, `Usa hasta ${MAX_ITEM_LABEL} caracteres`),
})

/** HU-11 CA1: free text, or one of the foods of the base that match it. */
function AddItemForm({ listId, onError }: { listId: string; onError: (message: string) => void }) {
  const addItem = useAddItem(listId)
  const {
    control,
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<z.input<typeof itemSchema>, unknown, z.output<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: { label: '' },
  })
  const term = useDebouncedValue(useWatch({ control, name: 'label' }).trim(), SUGGEST_DEBOUNCE_MS)
  const search = useFoodSearch(term.length >= 2 ? term : '')
  const suggestions = term.length >= 2 ? (search.data ?? []).slice(0, MAX_SUGGESTIONS) : []

  function add(label: string, foodId: string | null) {
    addItem.mutate(
      { id: crypto.randomUUID(), label, foodId },
      { onError: () => onError(`No pudimos agregar ${label}. Inténtalo de nuevo.`) },
    )
    reset()
    setFocus('label')
  }

  return (
    <Card radius="lg" className="space-y-3">
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(({ label }) => add(label, null))(event)}
        className="flex items-start gap-2"
      >
        <Input
          label="Agregar a la lista"
          placeholder="Ej.: leche, avena"
          autoComplete="off"
          enterKeyHint="done"
          maxLength={MAX_ITEM_LABEL}
          error={errors.label?.message}
          className="flex-1"
          {...register('label')}
        />
        <IconButton
          type="submit"
          label="Agregar"
          icon={<Plus aria-hidden="true" />}
          variant="accent"
          size="lg"
          className="mt-7"
        />
      </form>
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-on-surface-muted">De la base de alimentos</p>
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((food) => {
              const name = foodDisplayName(food)
              return (
                <li key={food.id}>
                  <button
                    type="button"
                    aria-label={`Agregar ${name}`}
                    onClick={() => add(name, food.id)}
                    className={cx(
                      'inline-flex min-h-11 items-center gap-2 rounded-chip bg-surface-2 px-4 text-left font-bold',
                      focusRing,
                      pressable,
                    )}
                  >
                    <Plus aria-hidden="true" className="size-4 shrink-0 text-accent" />
                    {name}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Card>
  )
}

function FinishSheet({
  list,
  open,
  onClose,
}: {
  list: ShoppingList
  open: boolean
  onClose: () => void
}) {
  const finishList = useFinishList()
  const pending = list.items.length - listProgress(list.items).checked
  return (
    <Sheet open={open} onClose={onClose} title="¿Terminar esta lista?">
      <div className="space-y-4">
        <p className="font-semibold text-ink-soft">
          {pending > 0
            ? `${pending === 1 ? 'Queda 1' : `Quedan ${pending}`} sin marcar. La lista se guarda en Listas anteriores y puedes crear una nueva.`
            : 'La lista se guarda en Listas anteriores y puedes crear una nueva.'}
        </p>
        {finishList.isError && (
          <p role="alert" className="font-bold text-ink">
            No pudimos terminar la lista. Inténtalo de nuevo.
          </p>
        )}
        <Button
          fullWidth
          disabled={finishList.isPending}
          onClick={() => finishList.mutate(list.id, { onSuccess: onClose })}
        >
          Terminar lista
        </Button>
        <Button fullWidth variant="secondary" onClick={onClose}>
          Seguir comprando
        </Button>
      </div>
    </Sheet>
  )
}

/** HU-11 CA3: earlier lists stay as a record. */
function History() {
  const history = useListHistory()
  const timeZone = useTimeZone()
  if (!history.data || history.data.length === 0) return null
  return (
    <section aria-labelledby="list-history" className="space-y-3">
      <h2 id="list-history" className="px-1 text-lg font-extrabold">
        Listas anteriores
      </h2>
      <ul className="space-y-2">
        {history.data.map((list) => (
          <li
            key={list.id}
            className="flex items-center justify-between gap-3 rounded-card border border-surface-2 bg-surface px-4 py-3 text-on-surface"
          >
            <div>
              <p className="font-bold">{list.name}</p>
              <p className="text-sm font-semibold text-on-surface-muted">
                {formatDay(localDate(new Date(list.createdAt), timeZone))}
              </p>
            </div>
            <p className="text-sm font-bold text-on-surface-muted tabular-nums">
              {progressText(list)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
