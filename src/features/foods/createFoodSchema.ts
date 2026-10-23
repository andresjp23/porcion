import { z } from 'zod'
import type { Nutrients } from '@/domain/nutrition'
import {
  checkAtwater,
  MAX_GRAMS_100,
  MAX_KCAL_100,
  nutrientIssues,
  type NutrientField,
} from '@/domain/validation'
import { formatKcal } from '@/lib/format'

/** Most portions a food can have; plenty for "1 unidad", "1 taza", "1 lata"… */
export const MAX_PORTIONS = 10
/** A portion over 10 kg is a typo. */
export const MAX_PORTION_GRAMS = 10000

/** "12,5" or "12.5" as typed; empty or invalid becomes NaN, so it fails below. */
const decimalText = z
  .string()
  .trim()
  .transform((value) =>
    /^\d+([.,]\d+)?$/.test(value) ? Number(value.replace(',', '.')) : Number.NaN,
  )

const NUTRIENT_LABELS: Record<NutrientField, string> = {
  kcal: 'la energía',
  protein: 'la proteína',
  carbs: 'los carbohidratos',
  fat: 'las grasas',
}

export const createFoodSchema = z
  .object({
    name: z.string().trim().min(1, 'Escribe el nombre').max(120, 'Usa hasta 120 caracteres'),
    brand: z.string().trim().max(80, 'Usa hasta 80 caracteres'),
    basis: z.enum(['g', 'ml']),
    kcal: decimalText,
    protein: decimalText,
    carbs: decimalText,
    fat: decimalText,
    portions: z
      .array(
        z.object({
          name: z.string().trim().min(1, 'Escribe el nombre').max(40, 'Usa hasta 40 caracteres'),
          grams: decimalText.pipe(
            z
              .number('Escribe los gramos')
              .positive('Escribe los gramos')
              .max(MAX_PORTION_GRAMS, 'Revisa los gramos'),
          ),
        }),
      )
      .max(MAX_PORTIONS),
    /** HU-09 CA3: needed only when kcal and 4/4/9 disagree. */
    confirmAtwater: z.boolean(),
  })
  .superRefine((values, ctx) => {
    const per100: Nutrients = {
      kcal: values.kcal,
      protein: values.protein,
      carbs: values.carbs,
      fat: values.fat,
    }
    const unit = `100 ${values.basis}`
    const issues = nutrientIssues(per100)
    for (const issue of issues) {
      if (issue.field === 'macros') {
        ctx.addIssue({
          code: 'custom',
          path: ['fat'],
          message: `Proteína, carbohidratos y grasas suman más de ${MAX_GRAMS_100} g por ${unit}`,
        })
      } else if (issue.code === 'too_high') {
        const max = issue.field === 'kcal' ? `${MAX_KCAL_100} kcal` : `${MAX_GRAMS_100} g`
        ctx.addIssue({
          code: 'custom',
          path: [issue.field],
          message: `Por ${unit}, ${NUTRIENT_LABELS[issue.field]} no puede pasar de ${max}`,
        })
      } else {
        ctx.addIssue({ code: 'custom', path: [issue.field], message: 'Escribe un número' })
      }
    }
    if (issues.length === 0 && !checkAtwater(per100).isConsistent && !values.confirmAtwater) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmAtwater'],
        message: 'Confirma que copiaste bien los valores de la etiqueta',
      })
    }
  })

export type CreateFoodInput = z.input<typeof createFoodSchema>
export type CreateFoodValues = z.output<typeof createFoodSchema>

/**
 * The live R-07 line under the nutrition table, or null while a value is
 * missing or out of range.
 */
export function atwaterHint(values: Pick<CreateFoodInput, 'kcal' | 'protein' | 'carbs' | 'fat'>) {
  const per100 = {
    kcal: decimalText.parse(values.kcal),
    protein: decimalText.parse(values.protein),
    carbs: decimalText.parse(values.carbs),
    fat: decimalText.parse(values.fat),
  }
  if (nutrientIssues(per100).length > 0) return null
  const check = checkAtwater(per100)
  const estimate = `Según los macros serían ≈ ${formatKcal(check.estimatedKcal)} kcal.`
  return check.isConsistent
    ? { consistent: true, message: `${estimate} Coincide.` }
    : {
        consistent: false,
        message: `${estimate} Revisa que copiaste bien la etiqueta: la fibra o los polialcoholes pueden explicar la diferencia.`,
      }
}
