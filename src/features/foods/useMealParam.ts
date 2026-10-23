import { useSearchParams } from 'react-router'
import { mealAt, type Meal } from '@/domain/meal'
import { useAuth } from '@/features/auth/useAuth'
import { useProfile } from '@/features/profile/useProfile'
import { parseMeal } from '@/lib/meals'

const DEFAULT_TIME_ZONE = 'America/Santiago'

/**
 * The target meal of Agregar alimento and the Detail: `?meal=` when the "+" of
 * a meal opened them (HU-04 CA1), else the meal of the hour (R-09).
 */
export function useMealParam() {
  const [params, setParams] = useSearchParams()
  const auth = useAuth()
  const profile = useProfile(auth.status === 'signedIn' ? auth.session.user.id : undefined)
  const meal: Meal =
    parseMeal(params.get('meal')) ?? mealAt(new Date(), profile.data?.timezone ?? DEFAULT_TIME_ZONE)

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
