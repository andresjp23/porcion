import { z } from 'zod'
import { ageInYears, isBelowFloor, type Sex } from '@/domain/energy'
import { MAX_MACRO_GRAMS } from '@/domain/macros'

const CHOOSE_ONE = 'Elige una opción'

/** R-05: range for a kcal target set by hand. */
export const MIN_MANUAL_KCAL = 500
export const MAX_MANUAL_KCAL = 9999

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

/** HU-13: the weight of the day, on its own (Progreso). */
export const weightSchema = bodySchema.pick({ weightKg: true })

export const activitySchema = z.object({
  activity: z.enum(['sedentary', 'light', 'moderate', 'high', 'very_high'], CHOOSE_ONE),
})

export const goalSchema = z.object({
  goal: z.enum(['lose', 'maintain', 'gain'], CHOOSE_ONE),
})

/** Perfil (HU-15 CA1): the onboarding answers of steps 1–4, minus the weight (Progreso). */
export function profileDataSchema(today: string) {
  return sexAndBirthSchema(today)
    .extend(bodySchema.pick({ heightCm: true }).shape)
    .extend(activitySchema.shape)
    .extend(goalSchema.shape)
}

/** Whole numbers only, as typed in a text input. */
function integer(min: number, max: number, message: string) {
  return z
    .string()
    .trim()
    .transform((value) => (/^\d+$/.test(value) ? Number(value) : Number.NaN))
    .pipe(z.number(message).int(message).min(min, message).max(max, message))
}

const MACRO_MESSAGE = `Usa gramos enteros entre 0 y ${MAX_MACRO_GRAMS}`

/**
 * "Ajustar manualmente" (R-05, R-13). A target under the floor for the sex is
 * allowed only after ticking the confirmation.
 */
export function adjustTargetSchema(sex: Sex) {
  return z
    .object({
      kcal: integer(MIN_MANUAL_KCAL, MAX_MANUAL_KCAL, 'Usa una meta entre 500 y 9.999 kcal'),
      protein: integer(0, MAX_MACRO_GRAMS, MACRO_MESSAGE),
      carbs: integer(0, MAX_MACRO_GRAMS, MACRO_MESSAGE),
      fat: integer(0, MAX_MACRO_GRAMS, MACRO_MESSAGE),
      confirmBelowFloor: z.boolean(),
    })
    .refine((values) => !isBelowFloor(values.kcal, sex) || values.confirmBelowFloor, {
      path: ['confirmBelowFloor'],
      message: 'Confirma que quieres usar una meta bajo el mínimo recomendado',
    })
}
