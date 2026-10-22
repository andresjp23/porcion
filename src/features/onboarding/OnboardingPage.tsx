import { useQueryClient } from '@tanstack/react-query'
import { Navigate, useNavigate, useParams } from 'react-router'
import { useAuth } from '@/features/auth/useAuth'
import { profileKey, useProfile } from '@/features/profile/useProfile'
import { supabase } from '@/lib/supabase'
import { Button } from '@/ui/Button'
import { latestWeightKey, useLatestWeight } from './api'
import { firstIncompleteStep, parseStep } from './progress'
import { ActivityStep, BodyStep, GoalStep, SexAndBirthStep } from './steps'

/** HU-02: five steps at /onboarding/:step. StageGuard only lets in users who have not finished. */
export function OnboardingPage() {
  const auth = useAuth()
  const userId = auth.session?.user.id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { step: param } = useParams()
  const profile = useProfile(userId)
  const weight = useLatestWeight(userId)

  if (!userId || !profile.data || weight.isPending) return null
  if (weight.isError) {
    return (
      <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-4 text-center">
        <div>
          <p className="text-base font-bold text-ink">No pudimos cargar tus datos.</p>
          <Button size="md" className="mt-4" onClick={() => void weight.refetch()}>
            Reintentar
          </Button>
        </div>
      </main>
    )
  }

  const step = parseStep(param)
  const latestWeightKg = weight.data?.weight_kg ?? null
  const reachable = firstIncompleteStep(profile.data, latestWeightKg !== null)
  if (step === null || step > reachable) {
    return <Navigate to={`/onboarding/${reachable}`} replace />
  }

  const stepProps = {
    profile: profile.data,
    latestWeightKg,
    onBack: step > 1 ? () => void navigate(`/onboarding/${step - 1}`) : undefined,
    onSaved: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKey(userId) }),
        queryClient.invalidateQueries({ queryKey: latestWeightKey(userId) }),
      ])
      void navigate(`/onboarding/${step + 1}`)
    },
  }

  // `key` resets each step's form when moving between steps.
  switch (step) {
    case 1:
      return <SexAndBirthStep key={1} {...stepProps} />
    case 2:
      return <BodyStep key={2} {...stepProps} />
    case 3:
      return <ActivityStep key={3} {...stepProps} />
    case 4:
      return <GoalStep key={4} {...stepProps} />
    default:
      return <TargetPlaceholder onBack={stepProps.onBack} />
  }
}

/** Step 5 ("Tu meta") arrives in O-2. */
function TargetPlaceholder({ onBack }: { onBack?: () => void }) {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 py-12">
      <p className="text-sm font-bold text-ink-muted">Paso 5 de 5</p>
      <h1 className="mt-1 text-3xl font-extrabold text-ink">Tu meta diaria</h1>
      <p className="mt-3 text-base font-semibold text-ink-soft">
        Estamos preparando esta parte. Pronto verás aquí tu meta y tus macros.
      </p>
      <div className="mt-6 flex gap-3">
        {onBack && (
          <Button variant="secondary" size="md" onClick={onBack}>
            Volver
          </Button>
        )}
        <Button variant="ghost" size="md" onClick={() => void supabase.auth.signOut()}>
          Salir
        </Button>
      </div>
    </main>
  )
}
