import { WifiOff } from 'lucide-react'
import { useOnline } from '@/lib/useOnline'

/** Q-3: says so while there is no connection. Offline the app is read-only. */
export function OfflineBanner() {
  const online = useOnline()

  return (
    // Always in the DOM, so screen readers announce the change.
    <div role="status">
      {!online && (
        <p className="flex items-center justify-center gap-2 bg-surface px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 text-center text-sm font-bold text-on-surface">
          <WifiOff aria-hidden="true" className="size-4 shrink-0 text-accent" />
          Sin conexión. Puedes ver lo último que cargaste; para registrar, espera a que vuelva.
        </p>
      )}
    </div>
  )
}
