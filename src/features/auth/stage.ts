import type { Tables } from '@/lib/database.types'

/** Where a user is in the sign-up funnel; each stage has its own screens. */
export type Stage = 'signedOut' | 'consent' | 'onboarding' | 'app'

type ProfileGates = Pick<Tables<'profiles'>, 'privacy_accepted_at' | 'onboarding_completed_at'>

/** A-4: no session → login, no consent → /consent, no onboarding → onboarding. */
export function stageFor(signedIn: boolean, profile: ProfileGates | null): Stage {
  if (!signedIn || !profile) return 'signedOut'
  if (!profile.privacy_accepted_at) return 'consent'
  if (!profile.onboarding_completed_at) return 'onboarding'
  return 'app'
}

/** The screen each stage starts on. */
export const STAGE_HOME: Record<Stage, string> = {
  signedOut: '/login',
  consent: '/consent',
  onboarding: '/onboarding/1',
  app: '/',
}
