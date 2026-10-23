import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert } from 'lucide-react'
import { useId } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { MAX_REPORT_REASON } from '@/domain/reports'
import { cx } from '@/lib/cx'
import { Button, Card } from '@/ui'
import { Sheet } from '@/ui/Sheet'
import { focusRing } from '@/ui/styles'
import { useReportFood } from './api'

const reportSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Cuéntanos qué dato está mal')
    .max(MAX_REPORT_REASON, `Usa hasta ${MAX_REPORT_REASON} caracteres`),
})

type ReportSheetProps = {
  foodId: string
  open: boolean
  onClose: () => void
}

/** HU-10 CA1: "Reportar un error" with a short reason. */
export function ReportSheet({ foodId, open, onClose }: ReportSheetProps) {
  const reasonId = useId()
  const errorId = `${reasonId}-error`
  const report = useReportFood(foodId)
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof reportSchema>, unknown, z.output<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: { reason: '' },
  })
  const reason = useWatch({ control, name: 'reason' })

  const onSubmit = handleSubmit(async ({ reason }) => {
    try {
      await report.mutateAsync(reason)
      onClose()
    } catch {
      // Shown below from report.error.
    }
  })

  return (
    <Sheet open={open} onClose={onClose} title="Reportar un error">
      <form noValidate onSubmit={(event) => void onSubmit(event)} className="space-y-4">
        <Card radius="lg" className="space-y-2">
          <label htmlFor={reasonId} className="block text-sm font-bold text-on-surface-muted">
            ¿Qué dato está mal?
          </label>
          <textarea
            id={reasonId}
            rows={3}
            maxLength={MAX_REPORT_REASON}
            placeholder="Ej.: las calorías son por 100 ml, no por 100 g"
            aria-invalid={errors.reason ? true : undefined}
            aria-describedby={errors.reason ? errorId : undefined}
            className={cx(
              'w-full resize-none rounded-field bg-surface-2 px-4 py-3 text-base font-bold text-on-surface placeholder:text-on-surface-muted',
              errors.reason ? 'border-2 border-on-surface' : 'border-2 border-transparent',
              focusRing,
            )}
            {...register('reason')}
          />
          <div className="flex items-start justify-between gap-3 text-sm font-semibold text-on-surface-muted">
            {errors.reason ? (
              <p id={errorId} className="flex items-center gap-2 font-bold text-on-surface">
                <CircleAlert aria-hidden="true" className="size-4 shrink-0 text-accent" />
                {errors.reason.message}
              </p>
            ) : (
              <p>Lo revisamos y corregimos el alimento para todos.</p>
            )}
            <p className="shrink-0 tabular-nums">
              {reason.length}/{MAX_REPORT_REASON}
            </p>
          </div>
        </Card>
        {report.error && (
          <p role="alert" className="flex items-center gap-2 font-bold text-ink">
            <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
            No pudimos enviar el reporte. Inténtalo de nuevo.
          </p>
        )}
        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Enviando…' : 'Enviar reporte'}
        </Button>
      </form>
    </Sheet>
  )
}
