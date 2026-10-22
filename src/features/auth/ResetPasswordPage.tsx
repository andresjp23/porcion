import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { Input } from '@/ui/Input'
import { AuthLayout } from './AuthLayout'
import { linkOnBone } from './styles'
import { useAuth } from './useAuth'

const resetSchema = z
  .object({
    password: z.string().min(8, 'Usa mínimo 8 caracteres'),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    message: 'Las contraseñas no coinciden',
  })

type ResetValues = z.infer<typeof resetSchema>

/**
 * HU-01 CA4, step 2. The email link brings a one-time code; supabase-js swaps it
 * for a session on load, so a valid link means a signed-in user here.
 */
export function ResetPasswordPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({ resolver: zodResolver(resetSchema) })

  if (auth.status === 'loading') return null

  if (auth.status === 'signedOut') {
    return (
      <AuthLayout
        title="El enlace no es válido"
        subtitle="Puede que haya vencido, que ya lo hayas usado o que lo abrieras en otro navegador. Pide uno nuevo."
      >
        <p className="mt-8 text-center text-base font-semibold text-ink-soft">
          <Link to="/forgot-password" className={linkOnBone}>
            Pedir otro enlace
          </Link>
        </p>
      </AuthLayout>
    )
  }

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      if (error.code === 'same_password') {
        setError('password', { message: 'Elige una contraseña distinta a la anterior' })
      } else if (error.code === 'weak_password') {
        setError('password', { message: 'Elige una contraseña más segura' })
      } else {
        setFormError('No pudimos cambiar tu contraseña. Inténtalo de nuevo en un momento.')
      }
      return
    }
    void navigate('/', { replace: true })
  })

  return (
    <AuthLayout title="Crea una contraseña nueva" subtitle="Úsala la próxima vez que ingreses.">
      <form
        noValidate
        onSubmit={(event) => void onSubmit(event)}
        aria-label="Cambiar contraseña"
        className="mt-8"
      >
        <Card radius="lg" className="space-y-4">
          <Input
            label="Contraseña nueva"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Repite la contraseña"
            type="password"
            autoComplete="new-password"
            error={errors.confirm?.message}
            {...register('confirm')}
          />
        </Card>

        {formError && (
          <p role="alert" className="mt-4 text-center text-base font-bold text-ink">
            {formError}
          </p>
        )}

        <Button type="submit" fullWidth className="mt-4" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </AuthLayout>
  )
}
