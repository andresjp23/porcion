import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { weightSchema } from '@/features/onboarding/schemas'
import { formatKg } from '@/lib/format'
import { Button, Card, Input, Sheet } from '@/ui'
import { useSaveWeight } from './api'

type WeightSheetProps = {
  open: boolean
  onClose: () => void
  onSaved: (weightKg: number) => void
  timeZone: string
  /** Today's entry, if there is one: saving again replaces it (HU-13 CA1). */
  todayKg: number | null
  /** Prefills the field when there is no entry today yet. */
  latestKg: number | null
}

/** "80.5" → "80,5": the field accepts a decimal comma, as people type it in Chile. */
function toInput(value: number | null) {
  return value === null ? '' : String(value).replace('.', ',')
}

/** HU-13: the weight of the day, one per day. */
export function WeightSheet({
  open,
  onClose,
  onSaved,
  timeZone,
  todayKg,
  latestKg,
}: WeightSheetProps) {
  const saveWeight = useSaveWeight(timeZone)
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof weightSchema>, unknown, z.output<typeof weightSchema>>({
    resolver: zodResolver(weightSchema),
    values: { weightKg: toInput(todayKg ?? latestKg) },
    // A refetch while the sheet is open must not wipe what the user typed.
    resetOptions: { keepDirtyValues: true },
  })

  const close = () => {
    reset()
    setError(null)
    onClose()
  }
  const submit = handleSubmit(async ({ weightKg }) => {
    setError(null)
    try {
      await saveWeight.mutateAsync(weightKg)
    } catch {
      setError('No pudimos guardar tu peso. Revisa tu conexión e inténtalo de nuevo.')
      return
    }
    onSaved(weightKg)
  })

  return (
    <Sheet open={open} onClose={close} title="Registrar peso">
      <form noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
        <Card radius="lg">
          <Input
            label="Peso de hoy (kg)"
            hint={
              todayKg === null
                ? 'Con un decimal, por ejemplo 70,5.'
                : `Hoy ya registraste ${formatKg(todayKg)} kg. Si guardas otro, lo reemplaza.`
            }
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            error={errors.weightKg?.message}
            {...register('weightKg')}
          />
        </Card>
        {error && (
          <p role="alert" className="font-bold text-ink">
            {error}
          </p>
        )}
        <Button type="submit" fullWidth disabled={isSubmitting}>
          Guardar
        </Button>
      </form>
    </Sheet>
  )
}
