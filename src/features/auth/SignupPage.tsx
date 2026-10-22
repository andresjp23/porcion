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
import { consentSchema, PRIVACY_VERSION } from './consent'
import { ConsentFields } from './ConsentFields'
import { EmailDivider, GoogleButton } from './GoogleButton'
import { linkOnBone } from './styles'
import { useAuth } from './useAuth'

const signupSchema = z
  .object({
    email: z.email('Ingresa un correo válido'),
    password: z.string().min(8, 'Usa mínimo 8 caracteres'),
  })
  .extend(consentSchema.shape)

type SignupValues = z.infer<typeof signupSchema>

const EMAIL_TAKEN = 'Ya existe una cuenta con este correo. Ingresa o recupera tu contraseña.'

/** HU-01: sign up with email and password, accepting the policy in the form. */
export function SignupPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) })

  if (auth.status === 'signedIn') return <Navigate to="/" replace />

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // The profile trigger copies it and the server stamps the time.
        data: { privacy_version: PRIVACY_VERSION },
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) {
      if (error.code === 'user_already_exists' || error.code === 'email_exists') {
        setError('email', { message: EMAIL_TAKEN })
      } else if (error.code === 'weak_password') {
        setError('password', { message: 'Elige una contraseña más segura' })
      } else {
        setFormError('No pudimos crear tu cuenta. Inténtalo de nuevo en un momento.')
      }
      return
    }
    // With email confirmation on, an existing address returns a user with no identities.
    if (data.user?.identities?.length === 0) {
      setError('email', { message: EMAIL_TAKEN })
      return
    }
    if (data.session) {
      void navigate('/', { replace: true })
    } else {
      setConfirmationSentTo(email)
    }
  })

  if (confirmationSentTo) {
    return (
      <AuthLayout
        title="Revisa tu correo"
        subtitle={`Te enviamos un enlace a ${confirmationSentTo} para confirmar tu cuenta.`}
      >
        <p className="mt-8 text-center text-base font-semibold text-ink-soft">
          <Link to="/login" className={linkOnBone}>
            Volver a Ingresar
          </Link>
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Crea tu cuenta" subtitle="Guarda tus comidas, tu meta y tu progreso.">
      <GoogleButton
        disabled={isSubmitting}
        onStart={() => setFormError(null)}
        onError={setFormError}
      />
      <EmailDivider />

      <form
        noValidate
        onSubmit={(event) => void onSubmit(event)}
        aria-label="Crear cuenta con correo"
      >
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
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            error={errors.password?.message}
            {...register('password')}
          />
          <ConsentFields
            fields={{ acceptsPolicy: register('acceptsPolicy'), isAdult: register('isAdult') }}
            errors={errors}
          />
        </Card>

        {formError && (
          <p role="alert" className="mt-4 text-center text-base font-bold text-ink">
            {formError}
          </p>
        )}

        <Button type="submit" fullWidth className="mt-4" disabled={isSubmitting}>
          {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </form>

      <p className="mt-5 text-center text-base font-semibold text-ink-soft">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className={linkOnBone}>
          Ingresar
        </Link>
      </p>
    </AuthLayout>
  )
}
