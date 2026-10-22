import { stageFor } from './stage'

const done = '2026-10-22T12:00:00Z'

describe('stageFor', () => {
  it('sends visitors without a session to sign in', () => {
    expect(stageFor(false, null)).toBe('signedOut')
  })

  it('treats a session without a profile as signed out (stale session)', () => {
    expect(stageFor(true, null)).toBe('signedOut')
  })

  it('asks for consent before anything else', () => {
    expect(stageFor(true, { privacy_accepted_at: null, onboarding_completed_at: null })).toBe(
      'consent',
    )
  })

  it('asks for onboarding after consent', () => {
    expect(stageFor(true, { privacy_accepted_at: done, onboarding_completed_at: null })).toBe(
      'onboarding',
    )
  })

  it('lets a fully set-up user into the app', () => {
    expect(stageFor(true, { privacy_accepted_at: done, onboarding_completed_at: done })).toBe('app')
  })
})
