import { ChefHat, ChevronLeft, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { localDate } from '@/domain/dates'
import { isFinished } from '@/domain/mealPrep'
import { useTimeZone } from '@/features/profile/useProfile'
import { cx } from '@/lib/cx'
import { formatDay } from '@/lib/format'
import { useGoBack } from '@/lib/useGoBack'
import { BottomNav, Button, buttonClasses, EmptyState, IconButton } from '@/ui'
import { focusRing, pressable } from '@/ui/styles'
import { toMealPrep, useMealPreps, type MealPrepRecord } from './api'
import { MealPrepCard } from './MealPrepCard'

/** Meal prep (HU-19): active batches first, then the finished ones. */
export function MealPrepListPage() {
  const goBack = useGoBack('/foods')
  const preps = useMealPreps()
  const today = localDate(new Date(), useTimeZone())
  const active = preps.data?.filter((prep) => !isFinished(toMealPrep(prep))) ?? []
  const finished = preps.data?.filter((prep) => isFinished(toMealPrep(prep))) ?? []

  return (
    <>
      <main className="mx-auto min-h-dvh max-w-md space-y-4 px-4 pt-6 pb-32">
        <header className="flex items-center gap-3">
          <IconButton
            label="Volver"
            icon={<ChevronLeft aria-hidden="true" />}
            size="lg"
            onClick={goBack}
          />
          <h1 className="text-3xl font-extrabold">Meal prep</h1>
        </header>

        <Link to="/meal-prep/new" className={buttonClasses({ fullWidth: true })}>
          <Plus aria-hidden="true" className="size-6" />
          Nuevo meal prep
        </Link>

        {preps.isPending && <p className="px-1 font-semibold text-ink-muted">Cargando…</p>}
        {preps.isError && (
          <div className="text-center">
            <p className="font-bold">No pudimos cargar tus meal prep.</p>
            <Button size="md" className="mt-4" onClick={() => void preps.refetch()}>
              Reintentar
            </Button>
          </div>
        )}
        {preps.data?.length === 0 && (
          <EmptyState
            icon={<ChefHat aria-hidden="true" />}
            title="Aún no tienes meal prep"
            description="Anota lo que cocinas para la semana: los ingredientes en crudo y cuánto pesó ya cocinado. Después registras lo que te sirves."
          />
        )}

        {active.length > 0 && (
          <section aria-labelledby="active-heading" className="space-y-3">
            <h2 id="active-heading" className="px-1 text-lg font-extrabold">
              Activos
            </h2>
            <ul className="space-y-3">
              {active.map((prep) => (
                <li key={prep.id}>
                  <MealPrepCard prep={prep} today={today} to={`/meal-prep/${prep.id}`} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {finished.length > 0 && (
          <section aria-labelledby="finished-heading" className="space-y-3">
            <h2 id="finished-heading" className="px-1 text-lg font-extrabold">
              Terminados
            </h2>
            <ul className="space-y-2">
              {finished.map((prep) => (
                <li key={prep.id}>
                  <FinishedRow prep={prep} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <BottomNav />
    </>
  )
}

function FinishedRow({ prep }: { prep: MealPrepRecord }) {
  return (
    <Link
      to={`/meal-prep/${prep.id}`}
      className={cx(
        'flex min-h-14 items-center justify-between gap-3 rounded-card border border-line px-4 py-2 text-ink',
        focusRing,
        pressable,
      )}
    >
      <span className="font-extrabold [overflow-wrap:anywhere]">{prep.name}</span>
      <span className="shrink-0 text-sm font-semibold text-ink-soft">
        {formatDay(prep.cookedOn)}
      </span>
    </Link>
  )
}
