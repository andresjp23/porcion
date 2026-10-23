import { SearchX } from 'lucide-react'
import { Link } from 'react-router'
import { cx } from '@/lib/cx'
import { EmptyState } from '@/ui'
import { focusRing, pressable } from '@/ui/styles'

/** Any route that does not exist, including screens still to be built. */
export function NotFoundPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-4">
      <EmptyState
        icon={<SearchX aria-hidden="true" />}
        title="No encontramos esta página"
        description="Puede que el enlace esté incompleto o que la pantalla todavía no exista."
        action={
          <Link
            to="/"
            className={cx(
              'inline-flex h-11 items-center justify-center rounded-pill bg-surface px-5 font-extrabold text-on-surface',
              focusRing,
              pressable,
            )}
          >
            Ir a Hoy
          </Link>
        }
      />
    </main>
  )
}
