import { ArrowDown, ArrowUp, Equal } from 'lucide-react'
import type { z } from 'zod'
import type { OptionCard } from '@/ui/OptionCards'
import type { activitySchema, goalSchema } from './schemas'

// The choices of onboarding steps 1, 3 and 4, also used to edit them in Perfil (HU-15).

export const sexOptions: ReadonlyArray<OptionCard<'female' | 'male'>> = [
  { value: 'female', title: 'Mujer' },
  { value: 'male', title: 'Hombre' },
]

export const activityOptions: ReadonlyArray<
  OptionCard<z.output<typeof activitySchema>['activity']>
> = [
  { value: 'sedentary', title: 'Sedentario', description: 'Poco o nada de ejercicio' },
  { value: 'light', title: 'Ligero', description: 'Ejercicio 1 a 3 días por semana' },
  { value: 'moderate', title: 'Moderado', description: 'Ejercicio 3 a 5 días por semana' },
  { value: 'high', title: 'Alto', description: 'Ejercicio 6 a 7 días por semana' },
  { value: 'very_high', title: 'Muy alto', description: 'Trabajo físico y además entrenas' },
]

export const goalOptions: ReadonlyArray<OptionCard<z.output<typeof goalSchema>['goal']>> = [
  {
    value: 'lose',
    title: 'Bajar de peso',
    description: 'Déficit moderado, ≈ 0,5 kg por semana',
    icon: <ArrowDown className="size-6" />,
  },
  {
    value: 'maintain',
    title: 'Mantener mi peso',
    description: 'Comer lo que gastas',
    icon: <Equal className="size-6" />,
  },
  {
    value: 'gain',
    title: 'Subir de peso',
    description: 'Superávit moderado, ≈ 0,25 kg por semana',
    icon: <ArrowUp className="size-6" />,
  },
]
