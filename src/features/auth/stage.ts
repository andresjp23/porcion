import type { Tables } from '@/lib/database.types'
import { PRIVACY_VERSION } from './consent'

/** Where a user is in the sign-up funnel; each stage has its own screens. */
export type Stage = 'signedOut' | 'consent' | 'onboarding' | 'app'

type ProfileGates = Pick<
  Tables<'profiles'>,
  'privacy_version' | 'privacy_accepted_at' | 'onboarding_completed_at'
>

/**
 * A-4: no session → login, no consent → /consent, no onboarding → onboarding.
 * Consent to an older version of the policy counts as none (U-4c).
 */
export function stageFor(signedIn: boolean, profile: ProfileGates | null): Stage {
  if (!signedIn || !profile) return 'signedOut'
  if (!profile.privacy_accepted_at || profile.privacy_version !== PRIVACY_VERSION) return 'consent'
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
