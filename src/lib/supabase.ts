import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { parseEnv } from './env'

const env = parseEnv(import.meta.env)

/** The only Supabase client in the app. Uses the anon key; RLS does the rest. */
export const supabase = createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  // PKCE: Google returns a one-time code that only this browser can exchange.
  auth: { flowType: 'pkce' },
})
