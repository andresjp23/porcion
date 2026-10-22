import { parseEnv } from './env'

describe('parseEnv', () => {
  it('returns the Supabase settings', () => {
    const env = parseEnv({
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'anon',
    })
    expect(env.VITE_SUPABASE_URL).toBe('http://127.0.0.1:54321')
  })

  it('names the missing or invalid variables', () => {
    expect(() => parseEnv({ VITE_SUPABASE_URL: 'not a url' })).toThrow(
      /VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY/,
    )
  })
})
