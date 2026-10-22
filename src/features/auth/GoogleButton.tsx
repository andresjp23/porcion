import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/ui/Button'

type GoogleButtonProps = {
  disabled?: boolean
  /** Called before redirecting, so the page can clear its own errors. */
  onStart?: () => void
  onError: (message: string) => void
}

/** Starts Google sign-in. New Google users accept the policy later on /consent. */
export function GoogleButton({ disabled, onStart, onError }: GoogleButtonProps) {
  const [pending, setPending] = useState(false)

  async function signIn() {
    onStart?.()
    setPending(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    // On success the browser leaves for Google, so only failures land here.
    if (error) {
      setPending(false)
      onError('No pudimos conectar con Google. Inténtalo de nuevo en un momento.')
    }
  }

  return (
    <Button
      variant="secondary"
      fullWidth
      className="mt-8"
      disabled={disabled || pending}
      onClick={() => void signIn()}
      icon={
        <span
          aria-hidden="true"
          className="grid size-7 place-items-center rounded-full bg-on-surface text-sm font-extrabold text-surface"
        >
          G
        </span>
      }
    >
      Continuar con Google
    </Button>
  )
}

/** The "o con tu correo" divider under the Google button. */
export function EmailDivider() {
  return (
    <div className="my-5 flex items-center gap-4 text-sm font-bold text-ink-muted">
      <span aria-hidden="true" className="h-px flex-1 bg-line" />o con tu correo
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
    </div>
  )
}
