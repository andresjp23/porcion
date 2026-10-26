import { createClient } from '@supabase/supabase-js'
import { expect, type Page } from '@playwright/test'
import { PRIVACY_VERSION } from '../src/features/auth/consent'
import type { Database } from '../src/lib/database.types'

export const PASSWORD = 'e2e-password-123'

/** A fresh address per test, so runs never collide. */
export function uniqueEmail(name: string) {
  return `e2e-${name}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
}

/** Supabase as the app sees it: the URL and anon key from .env.local. */
export function anonClient() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url?.startsWith('http') || !key) {
    throw new Error('E2E needs VITE_SUPABASE_URL (http…) and VITE_SUPABASE_ANON_KEY in .env.local')
  }
  return createClient<Database>(url, key, { auth: { persistSession: false } })
}

/**
 * A user who already accepted the policy and finished onboarding (man, 30,
 * 178 cm, 80 kg, moderate, losing weight → 2240 kcal), set up through the API
 * so each flow starts where it matters.
 */
export async function createReadyUser(name: string) {
  const email = uniqueEmail(name)
  const supabase = anonClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password: PASSWORD,
    options: { data: { privacy_version: PRIVACY_VERSION } },
  })
  if (error || !data.user) throw error ?? new Error('Sign-up returned no user')
  const userId = data.user.id

  const profile = await supabase
    .from('profiles')
    .update({
      sex: 'male',
      birth_date: '1996-05-15',
      height_cm: 178,
      activity: 'moderate',
      goal: 'lose',
      kcal_target: 2240,
      protein_g: 128,
      carbs_g: 264,
      fat_g: 75,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq('id', userId)
  if (profile.error) throw profile.error
  const weight = await supabase.from('weight_entries').insert({
    date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }),
    weight_kg: 80,
  })
  if (weight.error) throw weight.error

  return { email, supabase }
}

export async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Correo' }).fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await page.waitForURL('/')
}

/**
 * The offline copy (Q-3) is saved at most once a second and counts as fresh for
 * 30 s, so a reload right after a change could restore the copy from before it.
 * Waits until the copy has `text` before reloading.
 */
export async function waitForOfflineCopy(page: Page, text: string) {
  await expect
    .poll(() =>
      page.evaluate(
        (wanted) =>
          Object.keys(localStorage).some(
            (key) =>
              key.startsWith('porcion-offline:') && localStorage.getItem(key)?.includes(wanted),
          ),
        text,
      ),
    )
    .toBe(true)
}
