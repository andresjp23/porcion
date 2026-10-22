import { z } from 'zod'
import { ageInYears } from '@/domain/energy'

const CHOOSE_ONE = 'Elige una opción'

/** Accepts "80,5" as well as "80.5": a decimal comma is what people type in Chile. */
function decimal(min: number, max: number, message: string) {
  return z
    .string()
    .trim()
    .transform((value) => (value === '' ? Number.NaN : Number(value.replace(',', '.'))))
    .pipe(z.number(message).min(min, message).max(max, message))
}

/** Step 1: sex for the calculation (R-03) and birth date, 18 or older (R-12). */
export function sexAndBirthSchema(today: string) {
  return z.object({
    sex: z.enum(['male', 'female'], CHOOSE_ONE),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ingresa tu fecha de nacimiento')
      .refine((date) => ageInYears(date, today) >= 18, 'La app es solo para mayores de 18 años')
      .refine((date) => ageInYears(date, today) <= 120, 'Revisa la fecha de nacimiento'),
  })
}

/** Step 2: height and weight, with the ranges of profiles and weight_entries. */
export const bodySchema = z.object({
  heightCm: decimal(100, 250, 'Ingresa una estatura entre 100 y 250 cm'),
  weightKg: decimal(30, 300, 'Ingresa un peso entre 30 y 300 kg'),
})

export const activitySchema = z.object({
  activity: z.enum(['sedentary', 'light', 'moderate', 'high', 'very_high'], CHOOSE_ONE),
})

export const goalSchema = z.object({
  goal: z.enum(['lose', 'maintain', 'gain'], CHOOSE_ONE),
})
