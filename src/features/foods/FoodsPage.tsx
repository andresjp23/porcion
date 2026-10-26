import { ChefHat, ChevronRight, CircleDashed, ScanBarcode, ShoppingCart } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { isFinished } from '@/domain/mealPrep'
import { listProgress } from '@/domain/shopping'
import { toMealPrep, useMealPreps } from '@/features/mealPrep/api'
import { useActiveList, usePendingCodes } from '@/features/shopping/api'
import { cx } from '@/lib/cx'
import { BottomNav } from '@/ui'
import { focusRing, pressable } from '@/ui/styles'

/**
 * Alimentos, the tab of the bottom bar (S-5b): the shopping list, the
 * supermarket mode, when there are any, the codes to complete (S-7), and
 * meal prep (MP-3).
 */
export function FoodsPage() {
  return (
    <>
      <main className="mx-auto min-h-dvh max-w-md space-y-4 px-4 pt-6 pb-32">
        <h1 className="text-3xl font-extrabold">Alimentos</h1>
        <ShoppingListCard />
        <NavCard
          to="/shopping/scan"
          icon={<ScanBarcode />}
          title="Modo supermercado"
          detail="Escanea lo que compras, con o sin lista"
        />
        <PendingCard />
        <MealPrepNavCard />
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
  return <NavCard to="/shopping" icon={<ShoppingCart />} title="Lista de compras" detail={detail} />
}

function MealPrepNavCard() {
  const preps = useMealPreps()
  const active = preps.data?.filter((prep) => !isFinished(toMealPrep(prep))).length ?? 0
  return (
    <NavCard
      to="/meal-prep"
      icon={<ChefHat />}
      title="Meal prep"
      detail={
        active === 0
          ? 'Anota lo que cocinaste para la semana'
          : active === 1
            ? '1 activo'
            : `${active} activos`
      }
    />
  )
}

/** HU-12 CA5: only while there are scanned codes to complete. */
function PendingCard() {
  const pending = usePendingCodes()
  const count = pending.data?.length ?? 0
  if (count === 0) return null
  return (
    <NavCard
      to="/add?tab=mine"
      icon={<CircleDashed />}
      title="Por completar"
      detail={
        count === 1
          ? '1 producto sin tabla nutricional'
          : `${count} productos sin tabla nutricional`
      }
    />
  )
}

function NavCard({
  to,
  icon,
  title,
  detail,
}: {
  to: string
  icon: ReactNode
  title: string
  detail: string
}) {
  return (
    <Link
      to={to}
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
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-lg font-extrabold">{title}</span>
        <span className="block font-semibold text-on-surface-muted">{detail}</span>
      </span>
      <ChevronRight aria-hidden="true" className="size-6 text-accent" />
    </Link>
  )
}
