import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { z } from 'zod'
import { localDate } from '@/domain/dates'
import type { Tables } from '@/lib/database.types'
import { Card } from '@/ui/Card'
import { Input } from '@/ui/Input'
import { OptionCards } from '@/ui/OptionCards'
import { saveWeightForToday, updateProfile } from './api'
import { activityOptions, goalOptions, sexOptions } from './options'
import { activitySchema, bodySchema, goalSchema, sexAndBirthSchema } from './schemas'
import { StepLayout } from './StepLayout'

type StepProps = {
  profile: Tables<'profiles'>
  latestWeightKg: number | null
  onBack?: () => void
  /** Refreshes the cached answers and moves to the next step. */
  onSaved: () => Promise<void>
}

const SAVE_ERROR = 'No pudimos guardar tu respuesta. Inténtalo de nuevo en un momento.'

/** Runs a save, then moves on; on failure keeps the user on the step with a message. */
function useSave(onSaved: () => Promise<void>) {
  const [error, setError] = useState<string | null>(null)
  async function save(write: () => Promise<void>) {
    setError(null)
    try {
      await write()
    } catch {
      setError(SAVE_ERROR)
      return
    }
    await onSaved()
  }
  return { error, save }
}

/** "80.5" → "80,5" for the inputs, which accept a decimal comma. */
function toInput(value: number | null) {
  return value === null ? '' : String(value).replace('.', ',')
}

export function SexAndBirthStep({ profile, onBack, onSaved }: StepProps) {
  const schema = sexAndBirthSchema(localDate(new Date(), profile.timezone))
  const { error, save } = useSave(onSaved)
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { sex: profile.sex ?? undefined, birthDate: profile.birth_date ?? '' },
  })

  const onSubmit = handleSubmit((values) =>
    save(() => updateProfile(profile.id, { sex: values.sex, birth_date: values.birthDate })),
  )

  return (
    <StepLayout
      step={1}
      title="Cuéntanos de ti"
      subtitle="Con tu sexo y tu edad calculamos cuánta energía gastas. No se los mostramos a nadie."
      onBack={onBack}
      onSubmit={(event) => void onSubmit(event)}
      submitting={isSubmitting}
      error={error}
    >
      <p className="mb-3 text-base font-extrabold text-ink">Sexo para el cálculo</p>
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
      <p className="mt-2 text-sm font-semibold text-ink-muted">
        La fórmula usa el sexo biológico porque cambia el gasto en reposo.
      </p>
      <Card radius="lg" className="mt-6">
        <Input
          label="Fecha de nacimiento"
          type="date"
          autoComplete="bday"
          error={errors.birthDate?.message}
          {...register('birthDate')}
        />
      </Card>
    </StepLayout>
  )
}

export function BodyStep({ profile, latestWeightKg, onBack, onSaved }: StepProps) {
  const { error, save } = useSave(onSaved)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof bodySchema>, unknown, z.output<typeof bodySchema>>({
    resolver: zodResolver(bodySchema),
    defaultValues: { heightCm: toInput(profile.height_cm), weightKg: toInput(latestWeightKg) },
  })

  const onSubmit = handleSubmit((values) =>
    save(async () => {
      await updateProfile(profile.id, { height_cm: values.heightCm })
      // O-1: the starting weight is today's entry (upsert).
      await saveWeightForToday(values.weightKg, profile.timezone)
    }),
  )

  return (
    <StepLayout
      step={2}
      title="Tu estatura y peso"
      subtitle="Tu peso de hoy queda como tu primer registro de progreso."
      onBack={onBack}
      onSubmit={(event) => void onSubmit(event)}
      submitting={isSubmitting}
      error={error}
    >
      <Card radius="lg" className="space-y-4">
        <Input
          label="Estatura (cm)"
          inputMode="decimal"
          placeholder="170"
          error={errors.heightCm?.message}
          {...register('heightCm')}
        />
        <Input
          label="Peso (kg)"
          inputMode="decimal"
          placeholder="70,5"
          error={errors.weightKg?.message}
          {...register('weightKg')}
        />
      </Card>
    </StepLayout>
  )
}

export function ActivityStep({ profile, onBack, onSaved }: StepProps) {
  const { error, save } = useSave(onSaved)
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof activitySchema>, unknown, z.output<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: { activity: profile.activity ?? undefined },
  })

  const onSubmit = handleSubmit((values) =>
    save(() => updateProfile(profile.id, { activity: values.activity })),
  )

  return (
    <StepLayout
      step={3}
      title="¿Cuánto te mueves?"
      subtitle="Piensa en una semana normal, contando trabajo y ejercicio."
      onBack={onBack}
      onSubmit={(event) => void onSubmit(event)}
      submitting={isSubmitting}
      error={error}
    >
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
    </StepLayout>
  )
}

export function GoalStep({ profile, onBack, onSaved }: StepProps) {
  const { error, save } = useSave(onSaved)
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof goalSchema>, unknown, z.output<typeof goalSchema>>({
    resolver: zodResolver(goalSchema),
    defaultValues: { goal: profile.goal ?? undefined },
  })

  const onSubmit = handleSubmit((values) =>
    save(() => updateProfile(profile.id, { goal: values.goal })),
  )

  return (
    <StepLayout
      step={4}
      title="¿Cuál es tu objetivo?"
      subtitle="Lo usamos para calcular tu meta diaria. Puedes cambiarlo cuando quieras."
      onBack={onBack}
      onSubmit={(event) => void onSubmit(event)}
      submitting={isSubmitting}
      error={error}
    >
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
    </StepLayout>
  )
}
