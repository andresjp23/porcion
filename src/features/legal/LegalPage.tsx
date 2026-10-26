import { ChevronLeft, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { PRIVACY_VERSION } from '@/features/auth/consent'
import { useGoBack } from '@/lib/useGoBack'
import { IconButton } from '@/ui'

type LegalPageProps = {
  title: string
  children: ReactNode
}

/**
 * Layout of /privacy and /terms (U-4). Open to everyone: they are read before
 * signing up (HU-01 CA2) and from Perfil (HU-16 CA3).
 */
export function LegalPage({ title, children }: LegalPageProps) {
  const goBack = useGoBack('/')

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pt-6 pb-12 text-ink">
      <header className="flex items-center gap-3">
        <IconButton
          label="Volver"
          icon={<ChevronLeft aria-hidden="true" />}
          size="lg"
          onClick={goBack}
        />
        <h1 className="text-3xl leading-tight font-extrabold">{title}</h1>
      </header>
      <p className="mt-4 font-semibold text-ink-muted">Versión {PRIVACY_VERSION}</p>

      <div role="note" className="mt-4 flex gap-3 rounded-card border border-line p-4">
        <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <p className="font-semibold">
          Borrador no revisado legalmente. Porción es un proyecto personal en desarrollo, y este
          texto se revisará antes de abrir la app al público.
        </p>
      </div>

      <div className="mt-8 space-y-8 text-base leading-relaxed font-semibold text-ink-soft [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-ink [&_li]:mt-1 [&_p+p]:mt-3 [&_ul+p]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-ink">
        {children}
      </div>
    </main>
  )
}
