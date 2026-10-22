import { ChevronLeft } from 'lucide-react'
import type { FormEventHandler, ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Button } from '@/ui/Button'
import { IconButton } from '@/ui/IconButton'
import { ONBOARDING_STEPS } from './progress'

type StepLayoutProps = {
  step: number
  title: string
  subtitle: string
  onBack?: () => void
  onSubmit: FormEventHandler<HTMLFormElement>
  submitting: boolean
  /** Shown above the button when saving fails. */
  error?: string | null
  children: ReactNode
}

/** Back button, progress, title and the "Continuar" button of each onboarding step. */
export function StepLayout({
  step,
  title,
  subtitle,
  onBack,
  onSubmit,
  submitting,
  error,
  children,
}: StepLayoutProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-6 pb-8">
      <div className="flex items-center gap-4">
        {onBack ? (
          <IconButton
            label="Volver al paso anterior"
            size="lg"
            icon={<ChevronLeft aria-hidden="true" className="size-6" />}
            onClick={onBack}
          />
        ) : (
          <span className="size-12 shrink-0" />
        )}
        <ol aria-hidden="true" className="flex flex-1 gap-2">
          {Array.from({ length: ONBOARDING_STEPS }, (_, index) => (
            <li
              key={index}
              className={cx(
                'h-1.5 flex-1 rounded-pill',
                index + 1 < step && 'bg-surface',
                index + 1 === step && 'bg-accent',
                index + 1 > step && 'bg-line',
              )}
            />
          ))}
        </ol>
      </div>

      <p className="mt-8 text-sm font-bold text-ink-muted">
        Paso {step} de {ONBOARDING_STEPS}
      </p>
      <h1 className="mt-1 text-3xl leading-tight font-extrabold text-ink">{title}</h1>
      <p className="mt-3 text-base font-semibold text-ink-soft">{subtitle}</p>

      <form noValidate onSubmit={onSubmit} aria-label={title} className="mt-6 flex flex-1 flex-col">
        <div className="flex-1">{children}</div>
        {error && (
          <p role="alert" className="mt-4 text-center text-base font-bold text-ink">
            {error}
          </p>
        )}
        <Button type="submit" fullWidth className="mt-6" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Continuar'}
        </Button>
      </form>
    </main>
  )
}
