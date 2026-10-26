import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import type { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button, Card, Input, Sheet } from '@/ui'
import {
  DELETE_CONFIRMATION,
  DemoAccountError,
  deleteAccountSchema,
  deleteMyAccount,
} from './deleteAccount'

type DeleteAccountSheetProps = {
  open: boolean
  onClose: () => void
}

/** HU-16 CA2: deleting the account, after typing the confirmation. */
export function DeleteAccountSheet({ open, onClose }: DeleteAccountSheetProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof deleteAccountSchema>, unknown, z.output<typeof deleteAccountSchema>>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { confirmation: '' },
  })

  const close = () => {
    reset()
    setError(null)
    onClose()
  }

  const submit = handleSubmit(async () => {
    setError(null)
    try {
      await deleteMyAccount()
    } catch (cause) {
      setError(
        cause instanceof DemoAccountError
          ? 'Esta es la cuenta demo, compartida por todos: no se puede eliminar.'
          : 'No pudimos eliminar tu cuenta. Revisa tu conexión e inténtalo de nuevo.',
      )
      return
    }
    // Leave the guarded routes first, so signing out does not bounce to /login.
    void navigate('/account-deleted', { replace: true })
    queryClient.clear()
    // The user no longer exists on the server: only the local session is left.
    await supabase.auth.signOut({ scope: 'local' })
  })

  return (
    <Sheet open={open} onClose={close} title="Eliminar tu cuenta">
      <form noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
        <div className="space-y-2 font-semibold text-ink-soft">
          <p>
            Borraremos tu cuenta, tu perfil, tus registros, tus pesos, tus favoritos y tus listas.
            No se puede deshacer.
          </p>
          <p>
            Los alimentos que aportaste se quedan en la base para todos, pero sin tu nombre. Si
            quieres una copia de tus datos, descárgala antes.
          </p>
        </div>
        <Card radius="lg">
          <Input
            label={`Escribe ${DELETE_CONFIRMATION} para confirmar`}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="done"
            error={errors.confirmation?.message}
            {...register('confirmation')}
          />
        </Card>
        {error && (
          <p role="alert" className="font-bold text-ink">
            {error}
          </p>
        )}
        <Button type="submit" variant="secondary" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Eliminando…' : 'Eliminar mi cuenta'}
        </Button>
        <Button variant="ghost" size="md" fullWidth onClick={close}>
          Cancelar
        </Button>
      </form>
    </Sheet>
  )
}
