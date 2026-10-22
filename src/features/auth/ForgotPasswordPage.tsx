import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { Input } from '@/ui/Input'
import { AuthLayout } from './AuthLayout'
import { linkOnBone } from './styles'

const forgotSchema = z.object({
  email: z.email('Ingresa un correo válido'),
})

type ForgotValues = z.infer<typeof forgotSchema>

/** HU-01 CA4, step 1: request a reset link by email. */
export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) })

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setFormError(
        error.code === 'over_email_send_rate_limit'
          ? 'Ya te enviamos un enlace hace poco. Espera un momento antes de pedir otro.'
          : 'No pudimos enviar el enlace. Inténtalo de nuevo en un momento.',
      )
      return
    }
    setSentTo(email)
  })

  if (sentTo) {
    // Same message whether or not the account exists, so it does not reveal who signed up.
    return (
      <AuthLayout
        title="Revisa tu correo"
        subtitle={`Si hay una cuenta con ${sentTo}, te enviamos un enlace para crear una contraseña nueva. Ábrelo en este mismo navegador.`}
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
    <AuthLayout
      title="Recupera tu contraseña"
      subtitle="Te enviaremos un enlace a tu correo para crear una nueva."
    >
      <form
        noValidate
        onSubmit={(event) => void onSubmit(event)}
        aria-label="Recuperar contraseña"
        className="mt-8"
      >
        <Card radius="lg">
          <Input
            label="Correo"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.cl"
            error={errors.email?.message}
            {...register('email')}
          />
        </Card>

        {formError && (
          <p role="alert" className="mt-4 text-center text-base font-bold text-ink">
            {formError}
          </p>
        )}

        <Button type="submit" fullWidth className="mt-4" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando…' : 'Enviar enlace'}
        </Button>
      </form>

      <p className="mt-5 text-center text-base font-semibold text-ink-soft">
        <Link to="/login" className={linkOnBone}>
          Volver a Ingresar
        </Link>
      </p>
    </AuthLayout>
  )
}
