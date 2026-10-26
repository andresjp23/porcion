import { addDays } from '../src/domain/dates'
import { ageInYears, suggestedTarget, type TargetInput } from '../src/domain/energy'
import { suggestedMacros } from '../src/domain/macros'
import { nutrientsForGrams, type Nutrients } from '../src/domain/nutrition'
import type { Meal } from '../src/domain/meal'
import { stableUuid, type SeedResult } from './seed'

// Q-5: a demo account with a few weeks of believable data, for screenshots and
// for whoever tries the app. Everything is derived from `today` and a fixed
// seed, so two runs on the same day give the same data.

/** Small deterministic PRNG (mulberry32): same seed, same "random" days. */
function random(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** [food name, portion name, quantity]: names as in data/. */
type Item = readonly [food: string, portion: string, quantity: number]

const MENUS: Record<Meal, readonly (readonly Item[])[]> = {
  breakfast: [
    [
      ['Marraqueta', '1/2 marraqueta', 1],
      ['Palta Hass', '1 cucharada', 2],
      ['Café', '1 taza', 1],
    ],
    [
      ['Avena', '1/3 de taza', 1],
      ['Leche descremada', '1 vaso (200 ml)', 1],
      ['Plátano', '1 plátano sin cáscara', 1],
    ],
    [
      ['Pan de molde integral', '1 rebanada', 2],
      ['Queso gauda', '1 lámina', 1],
      ['Café', '1 taza', 1],
    ],
    [
      ['Yogur natural', '1 pote (170 g)', 1],
      ['Frutilla', '1 taza', 1],
      ['Nueces', '1 puñado (28 g)', 0.5],
    ],
  ],
  lunch: [
    [
      ['Arroz blanco cocido', '1 taza', 1],
      ['Pechuga de pollo cocida', '1/2 pechuga', 1],
      ['Lechuga', '1 taza picada', 1],
      ['Tomate', '1 tomate mediano', 1],
      ['Aceite de oliva', '1 cucharada', 1],
    ],
    [
      ['Lentejas cocidas', '1 taza', 1.5],
      ['Marraqueta', '1/2 marraqueta', 1],
      ['Lechuga', '1 taza picada', 1],
    ],
    [
      ['Fideos cocidos', '1 taza', 1.5],
      ['Carne molida cocida', '1 porción (85 g)', 1],
      ['Tomate', '1 rodaja', 3],
    ],
    [
      ['Salmón cocido', '1/2 filete', 1],
      ['Papa cocida', '1 papa mediana', 1],
      ['Brócoli', '1 taza picado', 1],
    ],
    [
      ['Porotos cocidos', '1 taza', 1],
      ['Zapallo', '1 taza en cubos', 1],
      ['Marraqueta', '1/2 marraqueta', 1],
    ],
  ],
  snack: [
    [
      ['Hallulla', '1 hallulla', 1],
      ['Jamón de cerdo', '1 lámina', 2],
      ['Café', '1 taza', 1],
    ],
    [['Manzana', '1 manzana mediana', 1]],
    [
      ['Yogur natural', '1 pote (170 g)', 1],
      ['Plátano', '1 plátano sin cáscara', 1],
    ],
    [
      ['Marraqueta', '1/2 marraqueta', 1],
      ['Mermelada', '1 cucharada', 1],
      ['Café', '1 taza', 1],
    ],
  ],
  dinner: [
    [
      ['Huevo', '1 huevo', 2],
      ['Pan de molde integral', '1 rebanada', 2],
      ['Tomate', '1 tomate mediano', 1],
    ],
    [
      ['Quínoa cocida', '1 taza', 1],
      ['Atún en agua', '1 lata escurrida', 1],
      ['Pepino', '1/2 taza en rodajas', 1],
    ],
    [
      ['Pechuga de pavo cocida', '1 porción (85 g)', 1],
      ['Zapallo italiano', '1 zapallo italiano mediano', 1],
      ['Aceite de oliva', '1 cucharadita', 1],
    ],
    [
      ['Lomo de cerdo cocido', '1 porción (85 g)', 1],
      ['Papa cocida', '1 papa mediana', 1],
      ['Lechuga', '1 taza picada', 1],
    ],
  ],
}

/** Saturdays get a little extra, so the week chart shows a day over the target. */
const WEEKEND_TREAT: readonly Item[] = [
  ['Papas fritas', '1 porción mediana', 1],
  ['Bebida cola', '1 lata (350 ml)', 1],
]

const MEAL_HOURS: Record<Meal, string> = {
  breakfast: '08:15',
  lunch: '13:30',
  snack: '17:45',
  dinner: '20:30',
}

export const DEMO_PROFILE = {
  sex: 'female',
  birth_date: '1991-04-12',
  height_cm: 165,
  activity: 'light',
  goal: 'lose',
  timezone: 'America/Santiago',
} as const

export type DemoLog = {
  id: string
  log_date: string
  meal: Meal
  food_id: string
  portion_id: string
  quantity: number
  grams: number
  food_name: string
  created_at: string
} & Nutrients

export type DemoPlan = {
  profile: typeof DEMO_PROFILE & {
    kcal_target: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }
  weights: { date: string; weight_kg: number }[]
  logs: DemoLog[]
  favoriteFoodIds: string[]
  shopping: { label: string; food_id: string | null; checked: boolean }[]
}

const LOG_DAYS = 21
const WEIGHT_DAYS = 60

/** Everything the demo account holds, as of `today` (YYYY-MM-DD, Santiago). */
export function buildDemoPlan(today: string, seed: SeedResult): DemoPlan {
  const next = random(2026)
  const foods = new Map(seed.foods.map((food) => [food.name, food]))
  const foodByName = (name: string) => {
    const food = foods.get(name)
    if (!food) throw new Error(`Demo food not in the seed: ${name}`)
    return food
  }
  const portionOf = (foodKey: string, name: string) => {
    const portion = seed.portions.find((p) => p.foodKey === foodKey && p.name === name)
    if (!portion) throw new Error(`Demo portion not in the seed: ${foodKey} / ${name}`)
    return portion
  }

  // About −0.3 kg a week with daily noise, weighed on most days.
  const weights: DemoPlan['weights'] = []
  for (let back = WEIGHT_DAYS - 1; back >= 0; back--) {
    const noise = (next() - 0.5) * 0.8
    if (back !== 0 && next() < 0.3) continue
    const kg = 72.4 - (WEIGHT_DAYS - 1 - back) * 0.045 + noise
    weights.push({ date: addDays(today, -back), weight_kg: Math.round(kg * 10) / 10 })
  }

  const logs: DemoLog[] = []
  for (let back = LOG_DAYS - 1; back >= 0; back--) {
    const date = addDays(today, -back)
    const isSaturday = new Date(`${date}T12:00:00Z`).getUTCDay() === 6
    // Today is still in progress: breakfast and lunch only.
    const meals: Meal[] =
      back === 0 ? ['breakfast', 'lunch'] : ['breakfast', 'lunch', 'snack', 'dinner']
    for (const meal of meals) {
      if (meal === 'snack' && back !== 0 && next() < 0.25) continue
      const options = MENUS[meal]
      const items = [...options[Math.floor(next() * options.length)]!]
      if (meal === 'dinner' && isSaturday) items.push(...WEEKEND_TREAT)
      items.forEach(([foodName, portionName, quantity], order) => {
        const food = foodByName(foodName)
        const portion = portionOf(food.key, portionName)
        const grams = portion.grams * quantity
        // The database keeps two decimals per 100 g (numeric(6,2)).
        const per100 = Object.fromEntries(
          Object.entries(food.per100).map(([k, v]) => [k, Math.round(v * 100) / 100]),
        ) as Nutrients
        logs.push({
          id: stableUuid(`demo-log:${date}:${meal}:${order}`),
          log_date: date,
          meal,
          food_id: stableUuid(`food:${food.key}`),
          portion_id: stableUuid(`portion:${food.key}:${portion.name}`),
          quantity,
          grams,
          food_name: food.name,
          ...nutrientsForGrams(per100, grams),
          // Santiago is UTC−3 for most of the year; a minute apart keeps the order.
          created_at: `${date}T${MEAL_HOURS[meal]}:${String(order).padStart(2, '0')}-03:00`,
        })
      })
    }
  }

  const latestKg = weights.at(-1)!.weight_kg
  const input: TargetInput = {
    sex: DEMO_PROFILE.sex,
    weightKg: latestKg,
    heightCm: DEMO_PROFILE.height_cm,
    ageYears: ageInYears(DEMO_PROFILE.birth_date, today),
    activity: DEMO_PROFILE.activity,
    goal: DEMO_PROFILE.goal,
  }
  const kcal = suggestedTarget(input).kcal
  const macros = suggestedMacros(kcal, latestKg)

  const idOf = (name: string) => stableUuid(`food:${foodByName(name).key}`)
  return {
    profile: {
      ...DEMO_PROFILE,
      kcal_target: kcal,
      protein_g: macros.protein,
      carbs_g: macros.carbs,
      fat_g: macros.fat,
    },
    weights,
    logs,
    favoriteFoodIds: ['Marraqueta', 'Palta Hass', 'Yogur natural'].map(idOf),
    shopping: [
      { label: 'Leche descremada', food_id: idOf('Leche descremada'), checked: false },
      { label: 'Palta Hass', food_id: idOf('Palta Hass'), checked: true },
      { label: 'Tomates', food_id: null, checked: false },
      { label: 'Pan integral', food_id: null, checked: false },
      { label: 'Café', food_id: idOf('Café'), checked: true },
    ],
  }
}
