import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { z } from 'zod'
import { isBelowFloor, KCAL_FLOORS, type Sex } from '@/domain/energy'
import { checkTargetCoherence, macroEnergyShares, suggestedMacros } from '@/domain/macros'
import { formatKcal } from '@/lib/format'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { Checkbox } from '@/ui/Checkbox'
import { Input } from '@/ui/Input'
import { Sheet } from '@/ui/Sheet'
import { adjustTargetSchema } from './schemas'
import { classifyTarget, type DailyTarget } from './target'

type AdjustTargetSheetProps = {
  open: boolean
  onClose: () => void
  sex: Sex
  weightKg: number
  suggestedKcal: number
  current: DailyTarget
  onApply: (target: DailyTarget) => void
}

const MACROS = [
  { name: 'protein', label: 'Proteína (g)' },
  { name: 'carbs', label: 'Carbohidratos (g)' },
  { name: 'fat', label: 'Grasas (g)' },
] as const

/** Reads a whole number typed in an input, or null while it is not one. */
function wholeNumber(value: string | undefined) {
  return value !== undefined && /^\d+$/.test(value.trim()) ? Number(value) : null
}

/** "Ajustar manualmente" (R-05, R-13): kcal and macros by hand, separately. */
export function AdjustTargetSheet({
  open,
  onClose,
  sex,
  weightKg,
  suggestedKcal,
  current,
  onApply,
}: AdjustTargetSheetProps) {
  const schema = adjustTargetSchema(sex)
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      kcal: String(current.kcal),
      protein: String(current.protein),
      carbs: String(current.carbs),
      fat: String(current.fat),
      confirmBelowFloor: false,
    },
  })

  const values = useWatch({ control })
  const kcal = wholeNumber(values.kcal)
  const macros = {
    protein: wholeNumber(values.protein),
    carbs: wholeNumber(values.carbs),
    fat: wholeNumber(values.fat),
  }
  const macrosTouched =
    current.macrosAreManual || Boolean(dirtyFields.protein || dirtyFields.carbs || dirtyFields.fat)

  // R-13: while the macros are not set by hand, they follow the kcal target.
  useEffect(() => {
    if (macrosTouched || kcal === null || kcal <= 0) return
    const next = suggestedMacros(kcal, weightKg)
    setValue('protein', String(next.protein))
    setValue('carbs', String(next.carbs))
    setValue('fat', String(next.fat))
  }, [kcal, macrosTouched, weightKg, setValue])

  const complete =
    macros.protein !== null && macros.carbs !== null && macros.fat !== null
      ? { protein: macros.protein, carbs: macros.carbs, fat: macros.fat }
      : null
  const shares = complete ? macroEnergyShares(complete) : null
  const coherence = complete && kcal ? checkTargetCoherence(complete, kcal) : null
  const belowFloor = kcal !== null && isBelowFloor(kcal, sex)

  const onSubmit = handleSubmit(({ kcal, protein, carbs, fat }) => {
    onApply(classifyTarget({ kcal, protein, carbs, fat }, suggestedKcal, weightKg))
    onClose()
  })

  return (
    <Sheet open={open} onClose={onClose} title="Ajustar mi meta">
      <form noValidate onSubmit={(event) => void onSubmit(event)} aria-label="Ajustar mi meta">
        <Card radius="lg" className="space-y-4">
          <Input
            label="Meta diaria (kcal)"
            inputMode="numeric"
            error={errors.kcal?.message}
            {...register('kcal')}
          />
          {MACROS.map(({ name, label }) => (
            <Input
              key={name}
              label={label}
              inputMode="numeric"
              hint={
                shares ? `${Math.round(shares[name] * 100)} % de las kcal de tus macros` : undefined
              }
              error={errors[name]?.message}
              {...register(name)}
            />
          ))}
          {belowFloor && (
            <Checkbox
              label={`Entiendo que es menos de ${formatKcal(KCAL_FLOORS[sex])} kcal, el mínimo recomendado, y quiero usarla igual`}
              error={errors.confirmBelowFloor?.message}
              {...register('confirmBelowFloor')}
            />
          )}
        </Card>

        {coherence && !coherence.isCoherent && kcal !== null && (
          <div className="mt-4 rounded-card border border-line p-4">
            <p className="text-base font-semibold text-ink">
              Tus macros suman {formatKcal(coherence.kcalFromMacros)} kcal y tu meta es{' '}
              {formatKcal(kcal)} kcal.
            </p>
            <Button
              variant="secondary"
              size="md"
              className="mt-3"
              onClick={() =>
                setValue('kcal', String(Math.round(coherence.kcalFromMacros)), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              Usar {formatKcal(coherence.kcalFromMacros)} kcal como meta
            </Button>
          </div>
        )}

        <Button type="submit" fullWidth className="mt-4">
          Guardar
        </Button>
      </form>
    </Sheet>
  )
}
