import type { Session } from '@supabase/supabase-js'
import { createContext, use } from 'react'

export type AuthState =
  | { status: 'loading'; session: null }
  | { status: 'signedOut'; session: null }
  | { status: 'signedIn'; session: Session }

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const state = use(AuthContext)
  if (!state) throw new Error('useAuth must be used inside <AuthProvider>')
  return state
}
