import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { profileKey, useProfile } from '@/features/profile/useProfile'
import { supabase } from '@/lib/supabase'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { AuthLayout } from './AuthLayout'
import { consentSchema, PRIVACY_VERSION, type ConsentValues } from './consent'
import { ConsentFields } from './ConsentFields'
import { useAuth } from './useAuth'

/**
 * HU-01 CA2 for Google sign-in, which cannot send consent at sign-up: the user
 * accepts here before any health data is saved. StageGuard only shows it to
 * signed-in users who have not accepted yet, or who accepted an older version
 * of the policy (U-4c).
 */
export function ConsentPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const profile = useProfile(auth.session?.user.id)
  // U-4c: accepted before, but an older version of the policy.
  const isUpdate = Boolean(profile.data?.privacy_accepted_at)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConsentValues>({ resolver: zodResolver(consentSchema) })

  if (auth.status !== 'signedIn') return null
  const userId = auth.session.user.id

  const onSubmit = handleSubmit(async () => {
    setFormError(null)
    // The server stamps privacy_accepted_at (profiles_stamp_consent).
    const { data, error } = await supabase
      .from('profiles')
      .update({ privacy_version: PRIVACY_VERSION })
      .eq('id', userId)
      .select('id')
    // An update that matches no row is not an error for PostgREST (e.g. a stale session).
    if (error || data.length === 0) {
      setFormError('No pudimos guardar tu respuesta. Inténtalo de nuevo en un momento.')
      return
    }
    // Refresh the profile so the guards see the consent before moving on.
    await queryClient.invalidateQueries({ queryKey: profileKey(userId) })
    void navigate('/', { replace: true })
  })

  return (
    <AuthLayout
      title={isUpdate ? 'Actualizamos nuestras condiciones' : 'Antes de empezar'}
      subtitle={
        isUpdate
          ? 'Cambiaron los Términos o la Política de privacidad. Revísalos y acepta para seguir usando la app.'
          : 'Necesitamos tu acuerdo para guardar tus comidas, tu peso y tu meta.'
      }
    >
      <form
        noValidate
        onSubmit={(event) => void onSubmit(event)}
        aria-label="Aceptar la Política de privacidad"
        className="mt-8"
      >
        <Card radius="lg">
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
          {isSubmitting ? 'Guardando…' : 'Aceptar y continuar'}
        </Button>
      </form>

      <Button
        variant="ghost"
        size="md"
        className="mx-auto mt-3"
        onClick={() => void supabase.auth.signOut()}
      >
        Salir
      </Button>
    </AuthLayout>
  )
}
