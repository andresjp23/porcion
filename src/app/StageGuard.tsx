import { useEffect, type ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router'
import { STAGE_HOME, stageFor, type Stage } from '@/features/auth/stage'
import { useAuth } from '@/features/auth/useAuth'
import { useProfile } from '@/features/profile/useProfile'
import { supabase } from '@/lib/supabase'
import { Button } from '@/ui/Button'

function FullScreen({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-4 text-center">
      <div>{children}</div>
    </main>
  )
}

/** Renders the child routes only for users at `stage`; sends everyone else to their stage. */
export function StageGuard({ stage }: { stage: Stage }) {
  const auth = useAuth()
  const userId = auth.session?.user.id
  const profile = useProfile(userId)
  const staleSession = profile.isSuccess && profile.data === null

  useEffect(() => {
    // A session whose user no longer exists (e.g. after a local db reset).
    if (staleSession) void supabase.auth.signOut()
  }, [staleSession])

  if (auth.status === 'signedOut') return <Navigate to={STAGE_HOME.signedOut} replace />

  if (profile.isError) {
    return (
      <FullScreen>
        <p className="text-base font-bold text-ink">No pudimos cargar tu cuenta.</p>
        <Button size="md" className="mt-4" onClick={() => void profile.refetch()}>
          Reintentar
        </Button>
      </FullScreen>
    )
  }

  if (auth.status === 'loading' || !profile.isSuccess || staleSession) {
    return (
      <FullScreen>
        <p role="status" className="text-base font-bold text-ink-muted">
          Cargando…
        </p>
      </FullScreen>
    )
  }

  const current = stageFor(true, profile.data)
  if (current !== stage) return <Navigate to={STAGE_HOME[current]} replace />
  return <Outlet />
}
