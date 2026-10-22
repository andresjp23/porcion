import { z } from 'zod'

// Fails fast with a clear message when .env.local is missing or incomplete.
const envSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
})

export function parseEnv(source: Record<string, unknown>) {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const keys = result.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`Missing or invalid environment variables: ${keys}. See .env.example.`)
  }
  return result.data
}
