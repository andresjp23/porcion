import { Download } from 'lucide-react'
import { useState } from 'react'
import { localDate } from '@/domain/dates'
import { cx } from '@/lib/cx'
import { downloadJson } from '@/lib/download'
import { Button, Card } from '@/ui'
import { focusRing, pressable } from '@/ui/styles'
import { exportMyData } from './api'
import { DeleteAccountSheet } from './DeleteAccountSheet'

type PrivacyCardProps = {
  timeZone: string
  onExported: (notice: string) => void
}

/** HU-16: the user's rights over their data: export it (CA1) or delete the account (CA2). */
export function PrivacyCard({ timeZone, onExported }: PrivacyCardProps) {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function download() {
    setError(null)
    setExporting(true)
    try {
      const data = await exportMyData()
      downloadJson(`porcion-mis-datos-${localDate(new Date(), timeZone)}.json`, data)
      onExported('Descargamos tus datos')
    } catch {
      setError('No pudimos preparar tus datos. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Card radius="lg">
      <h2 className="text-lg font-extrabold">Tu privacidad</h2>
      <p className="mt-2 font-semibold text-on-surface-muted">
        Descarga una copia de todo lo que guardamos de ti: tu perfil, tus registros, tus pesos, tus
        listas y los alimentos que aportaste.
      </p>
      {error && (
        <p role="alert" className="mt-3 font-bold">
          {error}
        </p>
      )}
      <Button
        size="md"
        fullWidth
        className="mt-4"
        icon={<Download aria-hidden="true" className="size-5" />}
        onClick={() => void download()}
        disabled={exporting}
      >
        {exporting ? 'Preparando…' : 'Descargar mis datos'}
      </Button>
      <button
        type="button"
        onClick={() => setDeleting(true)}
        className={cx(
          'mt-3 min-h-11 w-full rounded-pill font-extrabold text-on-surface underline underline-offset-4',
          focusRing,
          pressable,
        )}
      >
        Eliminar mi cuenta
      </button>
      <DeleteAccountSheet open={deleting} onClose={() => setDeleting(false)} />
    </Card>
  )
}
