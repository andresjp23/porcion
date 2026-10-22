import { supabase } from '@/lib/supabase'
import { Button } from '@/ui/Button'

/** Placeholder so the A-4 guards have a destination; O-1 replaces it with the real steps. */
export function OnboardingPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 py-12">
      <h1 className="text-3xl font-extrabold text-ink">Cuéntanos de ti</h1>
      <p className="mt-3 text-base font-semibold text-ink-soft">
        Estamos preparando esta parte. Pronto podrás calcular tu meta diaria.
      </p>
      <Button
        variant="ghost"
        size="md"
        className="mt-6"
        onClick={() => void supabase.auth.signOut()}
      >
        Salir
      </Button>
    </main>
  )
}
