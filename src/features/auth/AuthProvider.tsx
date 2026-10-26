import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { persistForUser, removeOfflineCopies } from '@/app/queryClient'
import { supabase } from '@/lib/supabase'
import { AuthContext, type AuthState } from './useAuth'

function toState(session: Session | null): AuthState {
  return session ? { status: 'signedIn', session } : { status: 'signedOut', session: null }
}

/** Keeps the Supabase session in React state, including the return from Google. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({ status: 'loading', session: null })

  useEffect(() => {
    let userId: string | undefined
    // Fires INITIAL_SESSION first, then every sign-in, sign-out and token refresh.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user.id
      // Many query keys are not per user (['day', date]): nothing cached may
      // outlive the session it belongs to, in memory or on the device (Q-3).
      if (userId !== undefined && nextUserId !== userId) queryClient.clear()
      if (!nextUserId) removeOfflineCopies()
      userId = nextUserId
      setState(toState(session))
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const signedInUserId = state.session?.user.id
  useEffect(() => {
    if (signedInUserId) return persistForUser(queryClient, signedInUserId).stop
  }, [queryClient, signedInUserId])

  return <AuthContext value={state}>{children}</AuthContext>
}
