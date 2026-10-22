import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { Input } from '@/ui/Input'
import { AuthLayout } from './AuthLayout'
import { EmailDivider, GoogleButton } from './GoogleButton'
import { linkOnBone, linkOnSurface } from './styles'
import { useAuth } from './useAuth'

const loginSchema = z.object({
  email: z.email('Ingresa un correo válido'),
  password: z.string().min(8, 'La contraseña tiene mínimo 8 caracteres'),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  if (auth.status === 'signedIn') return <Navigate to="/" replace />

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setFormError(
        error.code === 'invalid_credentials'
          ? 'El correo o la contraseña no coinciden.'
          : 'No pudimos ingresar. Inténtalo de nuevo en un momento.',
      )
      return
    }
    void navigate('/', { replace: true })
  })

  return (
    <AuthLayout
      title="Registra lo que comes en segundos"
      subtitle="Ingresa para guardar tus comidas, tu meta y tu progreso."
    >
      <GoogleButton
        disabled={isSubmitting}
        onStart={() => setFormError(null)}
        onError={setFormError}
      />
      <EmailDivider />

      <form noValidate onSubmit={(event) => void onSubmit(event)} aria-label="Ingresar con correo">
        <Card radius="lg" className="space-y-4">
          <Input
            label="Correo"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.cl"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            placeholder="Mínimo 8 caracteres"
            error={errors.password?.message}
            {...register('password')}
          />
          <p className="text-right text-sm">
            <Link to="/forgot-password" className={linkOnSurface}>
              ¿Olvidaste tu contraseña?
            </Link>
          </p>
        </Card>

        {formError && (
          <p role="alert" className="mt-4 text-center text-base font-bold text-ink">
            {formError}
          </p>
        )}

        <Button type="submit" fullWidth className="mt-4" disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>

      <p className="mt-5 text-center text-base font-semibold text-ink-soft">
        ¿No tienes cuenta?{' '}
        <Link to="/signup" className={linkOnBone}>
          Crear cuenta
        </Link>
      </p>
      <p className="mt-3 text-center text-sm font-semibold text-ink-muted">
        Al crear tu cuenta te pediremos aceptar los{' '}
        <Link to="/terms" className={linkOnBone}>
          Términos
        </Link>{' '}
        y la{' '}
        <Link to="/privacy" className={linkOnBone}>
          Política de privacidad
        </Link>
        . Solo para mayores de 18 años.
      </p>
    </AuthLayout>
  )
}
