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

/** Deletes the signed-in user through the `delete-account` Edge Function. */
export async function deleteMyAccount() {
  const { error } = await supabase.functions.invoke('delete-account', {
    body: { confirmation: DELETE_CONFIRMATION },
  })
  if (error) throw error
}
