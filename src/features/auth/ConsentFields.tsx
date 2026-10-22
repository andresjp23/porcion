import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form'
import { Link } from 'react-router'
import { Checkbox } from '@/ui/Checkbox'
import type { ConsentValues } from './consent'
import { linkOnSurface } from './styles'

type ConsentFieldsProps = {
  /** `register('acceptsPolicy')` and `register('isAdult')` from the parent form. */
  fields: Record<keyof ConsentValues, UseFormRegisterReturn>
  errors: FieldErrors<ConsentValues>
}

/** HU-01 CA2: accept the Terms and Privacy Policy and confirm being 18 or older. */
export function ConsentFields({ fields, errors }: ConsentFieldsProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-on-surface-muted">
        Lee los{' '}
        <Link to="/terms" className={linkOnSurface}>
          Términos
        </Link>{' '}
        y la{' '}
        <Link to="/privacy" className={linkOnSurface}>
          Política de privacidad
        </Link>
        . Tu peso, tu meta y lo que comes son datos de salud: solo los usamos para que la app
        funcione.
      </p>
      <Checkbox
        label="Acepto los Términos y la Política de privacidad"
        error={errors.acceptsPolicy?.message}
        {...fields.acceptsPolicy}
      />
      <Checkbox label="Soy mayor de 18 años" error={errors.isAdult?.message} {...fields.isAdult} />
    </div>
  )
}
