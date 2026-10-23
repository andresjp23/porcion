import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { normalizeBarcode } from '@/domain/barcode'
import { Button, Card, Input, Sheet } from '@/ui'

const typedCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Escribe los números bajo las barras')
    .transform((value, ctx) => {
      const barcode = normalizeBarcode(value)
      if (!barcode) {
        ctx.addIssue({
          code: 'custom',
          message: /^[\d\s-]+$/.test(value)
            ? 'Revisa el código: tiene 8, 12 o 13 dígitos, y el último no coincide'
            : 'Usa solo los números del código',
        })
        return z.NEVER
      }
      return barcode.code
    }),
})

/** HU-08 CA1: the code typed by hand, checked like a scanned one. */
export function TypeCodeSheet({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (code: string) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof typedCodeSchema>, unknown, z.output<typeof typedCodeSchema>>({
    resolver: zodResolver(typedCodeSchema),
    defaultValues: { code: '' },
  })

  const close = () => {
    reset()
    onClose()
  }
  const submit = handleSubmit(({ code }) => {
    reset()
    onSubmit(code)
  })

  return (
    <Sheet open={open} onClose={close} title="Escribir el código">
      <form noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
        <Card radius="lg">
          <Input
            label="Código de barras"
            hint="Son los números bajo las barras, de 8 a 13 dígitos."
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint="search"
            error={errors.code?.message}
            {...register('code')}
          />
        </Card>
        <Button type="submit" fullWidth>
          Buscar producto
        </Button>
      </form>
    </Sheet>
  )
}
