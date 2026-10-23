import { zodResolver } from '@hookform/resolvers/zod'
import { Barcode, Check, ChevronLeft, Info, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { cx } from '@/lib/cx'
import { useGoBack } from '@/lib/useGoBack'
import { Button, Card, IconButton, Input, Segmented } from '@/ui'
import { Checkbox } from '@/ui/Checkbox'
import { focusRing, pressable } from '@/ui/styles'
import {
  atwaterHint,
  createFoodSchema,
  MAX_PORTIONS,
  type CreateFoodInput,
  type CreateFoodValues,
} from './createFoodSchema'

const BASIS_OPTIONS = [
  { value: 'g', label: 'por 100 g' },
  { value: 'ml', label: 'por 100 ml' },
] as const

type FoodFormProps = {
  title: string
  defaultValues: CreateFoodInput
  /** Shown, not editable: it comes from the scanner (HU-09 CA1). */
  barcode: string | null
  onSubmit: (values: CreateFoodValues) => Promise<void>
  /** Where "Volver" goes when there is no history. */
  backTo: string
  /** A failed save, shown above the button. */
  error?: ReactNode
}

/** The HU-09 form, shared by Nuevo alimento (B-6) and Editar alimento (B-7b). */
export function FoodForm({
  title,
  defaultValues,
  barcode,
  onSubmit,
  backTo,
  error,
}: FoodFormProps) {
  const goBack = useGoBack(backTo)
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateFoodInput, unknown, CreateFoodValues>({
    resolver: zodResolver(createFoodSchema),
    defaultValues,
  })
  const portions = useFieldArray({ control, name: 'portions' })
  const [kcal, protein, carbs, fat, basis] = useWatch({
    control,
    name: ['kcal', 'protein', 'carbs', 'fat', 'basis'],
  })
  const hint = atwaterHint({ kcal, protein, carbs, fat })

  const submit = handleSubmit(onSubmit)

  const unit = basis === 'ml' ? 'ml' : 'g'

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pt-6 pb-32">
      <header className="mb-6 flex items-center gap-3">
        <IconButton
          label="Volver"
          icon={<ChevronLeft aria-hidden="true" />}
          size="lg"
          onClick={goBack}
        />
        <h1 className="text-3xl font-extrabold">{title}</h1>
      </header>

      <form noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
        <Card radius="lg" className="space-y-4">
          {barcode && (
            <p className="inline-flex items-center gap-2 rounded-pill bg-surface-2 px-4 py-2 font-bold">
              <Barcode aria-hidden="true" className="size-5 text-accent" />
              Código {barcode}
            </p>
          )}
          <Input
            label="Nombre"
            autoComplete="off"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Marca"
            placeholder="Opcional"
            autoComplete="off"
            error={errors.brand?.message}
            {...register('brand')}
          />
        </Card>

        <Card radius="lg" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold">Tabla nutricional</h2>
            <Controller
              control={control}
              name="basis"
              render={({ field }) => (
                <Segmented
                  label="Valores"
                  options={BASIS_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  className="min-w-56"
                />
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Energía (kcal)"
              inputMode="decimal"
              error={errors.kcal?.message}
              {...register('kcal')}
            />
            <Input
              label="Proteína (g)"
              inputMode="decimal"
              error={errors.protein?.message}
              {...register('protein')}
            />
            <Input
              label="Carbohidratos (g)"
              inputMode="decimal"
              hint="Disponibles, sin la fibra"
              error={errors.carbs?.message}
              {...register('carbs')}
            />
            <Input
              label="Grasas (g)"
              inputMode="decimal"
              error={errors.fat?.message}
              {...register('fat')}
            />
          </div>
          {hint && (
            <div aria-live="polite" className="space-y-2">
              <p className="flex items-start gap-2 font-semibold text-on-surface-muted">
                {hint.consistent ? (
                  <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" />
                ) : (
                  <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" />
                )}
                {hint.message}
              </p>
              {!hint.consistent && (
                <Checkbox
                  label="Los valores son los de la etiqueta"
                  error={errors.confirmAtwater?.message}
                  {...register('confirmAtwater')}
                />
              )}
            </div>
          )}
        </Card>

        <section aria-labelledby="portions-heading" className="space-y-3">
          <h2 id="portions-heading" className="sr-only">
            Porciones
          </h2>
          {portions.fields.length > 0 && (
            <p className="px-1 text-sm font-semibold text-ink-soft">
              La primera porción es la que se usa al agregar con un toque.
            </p>
          )}
          {portions.fields.map((field, index) => (
            <Card key={field.id} className="flex items-start gap-3">
              <Input
                label={`Porción ${index + 1}`}
                placeholder="1 lata"
                autoComplete="off"
                className="flex-1"
                error={errors.portions?.[index]?.name?.message}
                {...register(`portions.${index}.name`)}
              />
              <Input
                label={`Gramos (${unit})`}
                inputMode="decimal"
                placeholder="120"
                className="w-28"
                error={errors.portions?.[index]?.grams?.message}
                {...register(`portions.${index}.grams`)}
              />
              <IconButton
                label={`Quitar porción ${index + 1}`}
                icon={<Trash2 aria-hidden="true" />}
                variant="subtle"
                className="mt-7"
                onClick={() => portions.remove(index)}
              />
            </Card>
          ))}
          {portions.fields.length < MAX_PORTIONS && (
            <button
              type="button"
              onClick={() => portions.append({ name: '', grams: '' })}
              className={cx(
                'flex min-h-14 w-full items-center justify-between rounded-card border-2 border-dashed border-ink-muted px-5 text-left font-bold text-ink',
                focusRing,
                pressable,
              )}
            >
              Agregar porción (ej. 1 lata = 120 {unit})
              <Plus aria-hidden="true" className="size-6" />
            </button>
          )}
        </section>

        {error}

        <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-md">
            <Button type="submit" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar alimento'}
            </Button>
          </div>
        </div>
      </form>
    </main>
  )
}
