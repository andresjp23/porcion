import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { localDate } from '../src/domain/dates'
import { PRIVACY_VERSION } from '../src/features/auth/consent'
import type { Database } from '../src/lib/database.types'
import { buildFromData } from './build-seed'
import { buildDemoPlan } from './demo'

// Q-5: (re)creates the demo account. Local by default:
//   npm run demo:seed
// Against another project (e.g. production, Q-4):
//   SUPABASE_URL=… SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… DEMO_PASSWORD=… npm run demo:seed
// The service role key is only used here, on the computer, to replace the
// account; the data goes in as the demo user, so RLS and the triggers apply.

const LOCAL_URL = 'http://127.0.0.1:54321'

function localKeys() {
  const env = execSync('supabase status -o env', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  const read = (name: string) => env.match(new RegExp(`^${name}="(.*)"$`, 'm'))?.[1]
  return { anon: read('ANON_KEY'), service: read('SERVICE_ROLE_KEY') }
}

function config() {
  const url = process.env.SUPABASE_URL ?? LOCAL_URL
  const isLocal = url === LOCAL_URL
  const keys = isLocal ? localKeys() : { anon: undefined, service: undefined }
  const anon = process.env.SUPABASE_ANON_KEY ?? keys.anon
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? keys.service
  const password = process.env.DEMO_PASSWORD ?? (isLocal ? 'porcion-demo' : undefined)
  if (!anon || !service || !password) {
    throw new Error(
      'Set SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY and DEMO_PASSWORD (or run `supabase start` for local).',
    )
  }
  return { url, anon, service, password, email: process.env.DEMO_EMAIL ?? 'demo@porcion.app' }
}

async function main() {
  const { url, anon, service, password, email } = config()
  const admin = createClient<Database>(url, service, { auth: { persistSession: false } })

  // Replace the previous demo account: deleting cascades to all its data.
  const { data: users, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listError) throw listError
  const previous = users.users.find((user) => user.email === email)
  if (previous) {
    const { error } = await admin.auth.admin.deleteUser(previous.id)
    if (error) throw error
  }
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { privacy_version: PRIVACY_VERSION },
  })
  if (createError) throw createError

  const demo = createClient<Database>(url, anon, { auth: { persistSession: false } })
  const { error: signInError } = await demo.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError

  const seed = buildFromData()
  const plan = buildDemoPlan(localDate(new Date(), 'America/Santiago'), seed)

  const check = ({ error }: { error: unknown }) => {
    if (error) throw error
  }
  check(
    await demo
      .from('profiles')
      .update({ ...plan.profile, onboarding_completed_at: new Date().toISOString() })
      .eq('id', created.user.id),
  )
  check(await demo.from('weight_entries').insert(plan.weights))
  check(await demo.from('food_logs').insert(plan.logs))
  check(await demo.from('favorites').insert(plan.favoriteFoodIds.map((food_id) => ({ food_id }))))
  const list = await demo.from('shopping_lists').insert({}).select('id').single()
  check(list)
  check(
    await demo.from('shopping_list_items').insert(
      plan.shopping.map(({ label, food_id, checked }) => ({
        list_id: list.data!.id,
        label,
        food_id,
        checked_at: checked ? new Date().toISOString() : null,
      })),
    ),
  )

  console.log(
    `Demo ready at ${url}: ${email} / ${password}\n` +
      `${plan.weights.length} weights, ${plan.logs.length} logs, target ${plan.profile.kcal_target} kcal`,
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
}
