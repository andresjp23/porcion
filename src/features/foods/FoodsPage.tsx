import { ChevronRight, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router'
import { listProgress } from '@/domain/shopping'
import { useActiveList } from '@/features/shopping/api'
import { cx } from '@/lib/cx'
import { BottomNav } from '@/ui'
import { focusRing, pressable } from '@/ui/styles'

/**
 * Alimentos, the tab of the bottom bar (S-5b). For now it leads to the
 * shopping list; the supermarket mode (S-6) and Por completar (S-7) join it.
 */
export function FoodsPage() {
  return (
    <>
      <main className="mx-auto min-h-dvh max-w-md space-y-4 px-4 pt-6 pb-32">
        <h1 className="text-3xl font-extrabold">Alimentos</h1>
        <ShoppingListCard />
      </main>
      <BottomNav />
    </>
  )
}

function ShoppingListCard() {
  const active = useActiveList()
  let detail = 'Anota lo que necesitas comprar'
  if (active.data) {
    const { checked, total } = listProgress(active.data.items)
    detail =
      total === 0
        ? 'Tu lista está vacía'
        : `${checked} de ${total} ${total === 1 ? 'marcado' : 'marcados'}`
  }

  return (
    <Link
      to="/shopping"
      className={cx(
        'flex items-center gap-4 rounded-card border border-surface-2 bg-surface p-4 text-on-surface',
        focusRing,
        pressable,
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-12 shrink-0 place-items-center rounded-icon bg-surface-2 text-accent"
      >
        <ShoppingCart />
      </span>
      <span className="flex-1">
        <span className="block text-lg font-extrabold">Lista de compras</span>
        <span className="block font-semibold text-on-surface-muted">{detail}</span>
      </span>
      <ChevronRight aria-hidden="true" className="size-6 text-accent" />
    </Link>
  )
}
