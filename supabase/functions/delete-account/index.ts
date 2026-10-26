// U-3: "Eliminar mi cuenta" (HU-16 CA2, derecho de supresión).
//
// Deleting a row of auth.users needs the service_role key, which never goes to
// the client, so this is the app's only server code (docs/design.md §1). The
// caller is identified by their own JWT, and only that user is deleted. The
// foreign keys do the rest: profile, weights, logs, favorites and lists cascade;
// contributed foods and reports stay with no author (R-11).
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

/** Same phrase as DELETE_CONFIRMATION in src/features/profile/deleteAccount.ts. */
const DELETE_CONFIRMATION = 'ELIMINAR'

// Secrets in production (Q-4): the app's origin, and the public demo account,
// which visitors must not be able to delete for everyone else (Q-5).
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'
const DEMO_EMAIL = Deno.env.get('DEMO_EMAIL')

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  Vary: 'Origin',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const body: unknown = await request.json().catch(() => null)
  const confirmation =
    typeof body === 'object' && body !== null && 'confirmation' in body
      ? body.confirmation
      : undefined
  if (confirmation !== DELETE_CONFIRMATION) return json(400, { error: 'confirmation_required' })

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json(401, { error: 'unauthorized' })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // Verifies the JWT with Auth; an anon key or a forged token gives no user.
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return json(401, { error: 'unauthorized' })
  if (DEMO_EMAIL && data.user.email === DEMO_EMAIL) return json(403, { error: 'demo_account' })

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id)
  if (deleteError) {
    console.error('delete-account failed', data.user.id, deleteError.message)
    return json(500, { error: 'delete_failed' })
  }
  return json(200, { deleted: true })
})
