import { z } from 'zod'

/**
 * Version of the Terms and Privacy Policy the user accepts (HU-01 CA2). Bump it
 * when the policy changes; the server stamps the acceptance time.
 */
export const PRIVACY_VERSION = '2026-10'

/** Both boxes must be ticked; they are not stored, only the policy version is. */
export const consentSchema = z.object({
  acceptsPolicy: z.literal(true, 'Debes aceptar para continuar'),
  isAdult: z.literal(true, 'La app es solo para mayores de 18 años'),
})

export type ConsentValues = z.infer<typeof consentSchema>
