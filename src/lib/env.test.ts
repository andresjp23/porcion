import { parseEnv } from './env'

describe('parseEnv', () => {
  it('returns the Supabase settings', () => {
    const env = parseEnv({
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'anon',
    })
    expect(env.VITE_SUPABASE_URL).toBe('http://127.0.0.1:54321')
  })

  it('identifies the app to Open Food Facts, with a default contact', () => {
    const base = { VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: 'anon' }
    expect(
      parseEnv({ ...base, VITE_OFF_USER_AGENT: 'Porcion/0.1 (yo@ejemplo.cl)' }).VITE_OFF_USER_AGENT,
    ).toBe('Porcion/0.1 (yo@ejemplo.cl)')
    expect(parseEnv(base).VITE_OFF_USER_AGENT).toMatch(/^Porcion\/0\.1 /)
  })

  it('names the missing or invalid variables', () => {
    expect(() => parseEnv({ VITE_SUPABASE_URL: 'not a url' })).toThrow(
      /VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY/,
    )
  })
})
