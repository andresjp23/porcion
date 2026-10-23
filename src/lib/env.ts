import { z } from 'zod'

// Fails fast with a clear message when .env.local is missing or incomplete.
const envSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  // Open Food Facts asks apps to identify themselves with a contact (design §4).
  VITE_OFF_USER_AGENT: z
    .string()
    .trim()
    .min(1)
    .default('Porcion/0.1 (+https://github.com/andresjp23/porcion)'),
})

export function parseEnv(source: Record<string, unknown>) {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const keys = result.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`Missing or invalid environment variables: ${keys}. See .env.example.`)
  }
  return result.data
}
