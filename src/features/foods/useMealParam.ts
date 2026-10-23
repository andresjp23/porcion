import { useSearchParams } from 'react-router'
import { mealAt, type Meal } from '@/domain/meal'
import { useTimeZone } from '@/features/profile/useProfile'
import { parseMeal } from '@/lib/meals'

/**
 * The target meal of Agregar alimento and the Detail: `?meal=` when the "+" of
 * a meal opened them (HU-04 CA1), else the meal of the hour (R-09).
 */
export function useMealParam() {
  const [params, setParams] = useSearchParams()
  const timeZone = useTimeZone()
  const meal: Meal = parseMeal(params.get('meal')) ?? mealAt(new Date(), timeZone)

  function setMeal(next: Meal) {
    setParams(
      (prev) => {
        const updated = new URLSearchParams(prev)
        updated.set('meal', next)
        return updated
      },
      { replace: true },
    )
  }

  return [meal, setMeal] as const
}
