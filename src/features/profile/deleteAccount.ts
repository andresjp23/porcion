import { FunctionsHttpError } from '@supabase/supabase-js'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

/** HU-16 CA2: what the user types to confirm. The Edge Function checks it too. */
export const DELETE_CONFIRMATION = 'ELIMINAR'

/** Case and surrounding spaces do not matter: "eliminar " confirms as well. */
export const deleteAccountSchema = z.object({
  confirmation: z
    .string()
    .refine(
      (value) => value.trim().toUpperCase() === DELETE_CONFIRMATION,
      `Escribe ${DELETE_CONFIRMATION} para confirmar`,
    ),
})

/** The public demo account (Q-5) cannot be deleted: everyone shares it. */
export class DemoAccountError extends Error {}

/** Deletes the signed-in user through the `delete-account` Edge Function. */
export async function deleteMyAccount() {
  const { error } = await supabase.functions.invoke('delete-account', {
    body: { confirmation: DELETE_CONFIRMATION },
  })
  if (!error) return
  if (error instanceof FunctionsHttpError) {
    const body: unknown = await error.context.json().catch(() => null)
    if (body && typeof body === 'object' && 'error' in body && body.error === 'demo_account') {
      throw new DemoAccountError()
    }
  }
  throw error
}
