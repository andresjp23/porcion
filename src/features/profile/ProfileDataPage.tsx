import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import type { z } from 'zod'
import { localDate } from '@/domain/dates'
import { suggestedTarget } from '@/domain/energy'
import { recalculateTarget } from '@/domain/target'
import { useAuth } from '@/features/auth/useAuth'
import { useLatestWeight } from '@/features/onboarding/api'
import { profileDataSchema } from '@/features/onboarding/schemas'
import { activityOptions, goalOptions, sexOptions } from '@/features/onboarding/options'
import { targetInputFrom } from '@/features/onboarding/target'
import type { Tables } from '@/lib/database.types'
import { useGoBack } from '@/lib/useGoBack'
import { Button, Card, IconButton, Input, OptionCards } from '@/ui'
import { savedTargetFrom, targetColumns, useUpdateProfile } from './api'
import { useProfile } from './useProfile'

/** "170.5" → "170,5" for the input, which accepts a decimal comma. */
const toInput = (value: number | null) => (value === null ? '' : String(value).replace('.', ','))

/** Editar mis datos (HU-15 CA1). Saving recalculates what is not set by hand (R-13). */
export function ProfileDataPage() {
  const auth = useAuth()
  const userId = auth.session?.user.id
  const profile = useProfile(userId)
  const weight = useLatestWeight(userId)

  if (!profile.data || !weight.isSuccess) return null
  return <DataForm profile={profile.data} weightKg={weight.data?.weight_kg ?? null} />
}

function DataForm({ profile, weightKg }: { profile: Tables<'profiles'>; weightKg: number | null }) {
  const navigate = useNavigate()
  const goBack = useGoBack('/profile')
  const update = useUpdateProfile(profile.id)
  const [error, setError] = useState<string | null>(null)
  const today = localDate(new Date(), profile.timezone)
  const schema = profileDataSchema(today)
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      sex: profile.sex ?? undefined,
      birthDate: profile.birth_date ?? '',
      heightCm: toInput(profile.height_cm),
      activity: profile.activity ?? undefined,
      goal: profile.goal ?? undefined,
    },
  })

  const submit = handleSubmit(async (values) => {
    const data = {
      sex: values.sex,
      birth_date: values.birthDate,
      height_cm: values.heightCm,
      activity: values.activity,
      goal: values.goal,
    }
    // Recalculate with the new answers; what is set by hand stays (R-13).
    const input = targetInputFrom(data, weightKg, today)
    const saved = savedTargetFrom(profile)
    const target =
      input && saved
        ? targetColumns(recalculateTarget(saved, suggestedTarget(input).kcal, input.weightKg).next)
        : {}
    setError(null)
    try {
      await update.mutateAsync({ ...data, ...target })
    } catch {
      setError('No pudimos guardar tus datos. Revisa tu conexión e inténtalo de nuevo.')
      return
    }
    void navigate('/profile', { replace: true })
  })

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pt-6 pb-8">
      <header className="mb-6 flex items-center gap-3">
        <IconButton
          label="Volver"
          icon={<ChevronLeft aria-hidden="true" />}
          size="lg"
          onClick={goBack}
        />
        <h1 className="text-3xl font-extrabold">Tus datos</h1>
      </header>
      <p className="mb-6 font-semibold text-ink-soft">
        Con estos datos calculamos tu meta. Si fijaste la meta o los macros a mano, se mantienen.
      </p>

      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        aria-label="Tus datos"
        className="space-y-6"
      >
        <section>
          <h2 className="mb-3 text-base font-extrabold">Sexo para el cálculo</h2>
          <Controller
            control={control}
            name="sex"
            render={({ field }) => (
              <OptionCards
                label="Sexo para el cálculo"
                options={sexOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.sex?.message}
              />
            )}
          />
        </section>

        <Card radius="lg" className="space-y-4">
          <Input
            label="Fecha de nacimiento"
            type="date"
            autoComplete="bday"
            error={errors.birthDate?.message}
            {...register('birthDate')}
          />
          <Input
            label="Estatura (cm)"
            inputMode="decimal"
            error={errors.heightCm?.message}
            {...register('heightCm')}
          />
        </Card>

        <section>
          <h2 className="mb-3 text-base font-extrabold">¿Cuánto te mueves?</h2>
          <Controller
            control={control}
            name="activity"
            render={({ field }) => (
              <OptionCards
                label="¿Cuánto te mueves?"
                options={activityOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.activity?.message}
              />
            )}
          />
        </section>

        <section>
          <h2 className="mb-3 text-base font-extrabold">¿Cuál es tu objetivo?</h2>
          <Controller
            control={control}
            name="goal"
            render={({ field }) => (
              <OptionCards
                label="¿Cuál es tu objetivo?"
                options={goalOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.goal?.message}
              />
            )}
          />
        </section>

        {error && (
          <p role="alert" className="text-center font-bold">
            {error}
          </p>
        )}
        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Guardar'}
        </Button>
      </form>
    </main>
  )
}
