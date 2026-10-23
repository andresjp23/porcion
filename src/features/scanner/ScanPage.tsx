import { CameraOff, Keyboard, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { formatBarcode, type Barcode } from '@/domain/barcode'
import { isIsoDate } from '@/domain/dates'
import { cx } from '@/lib/cx'
import { parseMeal } from '@/lib/meals'
import { useGoBack } from '@/lib/useGoBack'
import { Button, buttonClasses, IconButton, Sheet } from '@/ui'
import { focusRing } from '@/ui/styles'
import { useBarcodeLookup, type BarcodeLookup } from './api'
import { ScanFrame } from './ScanFrame'
import { TypeCodeSheet } from './TypeCodeSheet'
import { useBarcodeScanner } from './useBarcodeScanner'

/** The meal and day the scan logs to, passed on to every screen it opens. */
function useForwardParams() {
  const [params] = useSearchParams()
  return useCallback(
    (extra: Record<string, string | null | undefined> = {}) => {
      const next = new URLSearchParams()
      const meal = parseMeal(params.get('meal'))
      const date = params.get('date')
      if (meal) next.set('meal', meal)
      if (date && isIsoDate(date)) next.set('date', date)
      for (const [key, value] of Object.entries(extra)) if (value) next.set(key, value)
      const query = next.toString()
      return query ? `?${query}` : ''
    },
    [params],
  )
}

/**
 * Escáner (HU-08): reads one code, looks it up (R-10) and opens its Detail, or
 * offers to create it. The code can also be typed when there is no camera.
 */
export function ScanPage() {
  const navigate = useNavigate()
  const forward = useForwardParams()
  const goBack = useGoBack(`/add${forward()}`)
  const [code, setCode] = useState<string | null>(null)
  const [typing, setTyping] = useState(false)
  const lookup = useBarcodeLookup(code)

  const onDetect = useCallback((barcode: Barcode) => {
    navigator.vibrate?.(50)
    setCode(barcode.code)
  }, [])
  const { videoRef, status, retry } = useBarcodeScanner({
    onDetect,
    paused: code !== null || typing,
  })

  const foundId = lookup.data?.kind === 'found' ? lookup.data.foodId : null
  useEffect(() => {
    // HU-08 CA3. Replace, so Back from the Detail skips the scanner.
    if (foundId) void navigate(`/foods/${foundId}${forward()}`, { replace: true })
  }, [foundId, forward, navigate])

  const result: BarcodeLookup | null = lookup.isError
    ? { kind: 'unavailable' }
    : (lookup.data ?? null)
  const scanAnother = () => setCode(null)
  const cameraProblem = status === 'denied' || status === 'unavailable'

  return (
    <main className="fixed inset-0 overflow-hidden bg-camera text-on-surface">
      <video
        ref={videoRef}
        muted
        playsInline
        aria-hidden="true"
        className={cx(
          'absolute inset-0 size-full object-cover',
          status !== 'scanning' && 'invisible',
        )}
      />

      <div className="relative mx-auto flex h-full max-w-md flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <header className="grid grid-cols-[3rem_1fr_3rem] items-center">
          <IconButton
            label="Cerrar escáner"
            icon={<X aria-hidden="true" />}
            size="lg"
            variant="subtle"
            onClick={goBack}
          />
          <h1 className="justify-self-center rounded-pill bg-camera/70 px-4 py-1 text-xl font-extrabold">
            Escanear producto
          </h1>
        </header>

        {cameraProblem ? (
          <CameraProblem
            denied={status === 'denied'}
            onRetry={retry}
            onType={() => setTyping(true)}
          />
        ) : (
          <>
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <ScanFrame className="h-44 w-64" />
              {/* Dark backing keeps the text readable over a bright camera image. */}
              <p
                aria-live="polite"
                className="rounded-pill bg-camera/70 px-4 py-2 text-center font-bold"
              >
                {status === 'starting'
                  ? 'Abriendo la cámara…'
                  : code && lookup.isPending
                    ? `Buscando el código ${formatBarcode(code)}…`
                    : 'Centra el código de barras en el recuadro'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTyping(true)}
              className={cx(
                'mx-auto inline-flex min-h-11 items-center gap-2 rounded-pill bg-camera/70 px-4 font-extrabold underline underline-offset-4',
                focusRing,
              )}
            >
              <Keyboard aria-hidden="true" className="size-5 text-accent" />
              Escribir el código
            </button>
          </>
        )}
      </div>

      {code && result && result.kind !== 'found' && (
        <ResultSheet
          code={code}
          result={result}
          forward={forward}
          onRetry={() => void lookup.refetch()}
          onScanAnother={scanAnother}
        />
      )}

      <TypeCodeSheet
        open={typing}
        onClose={() => setTyping(false)}
        onSubmit={(typed) => {
          setTyping(false)
          setCode(typed)
        }}
      />
    </main>
  )
}

/** HU-08 CA1: no permission, or no camera at all. Typing the code always works. */
function CameraProblem({
  denied,
  onRetry,
  onType,
}: {
  denied: boolean
  onRetry: () => void
  onType: () => void
}) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-6">
      <div className="space-y-3 text-center">
        <span
          aria-hidden="true"
          className="mx-auto grid size-14 place-items-center rounded-icon bg-surface text-accent"
        >
          <CameraOff />
        </span>
        <h2 className="text-2xl font-extrabold">
          {denied ? 'Necesitamos permiso para usar la cámara' : 'No pudimos abrir la cámara'}
        </h2>
        {denied ? (
          <div className="space-y-2 text-left font-semibold text-on-surface-muted">
            <p>Solo la usamos para leer el código de barras. Para activarla:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-on-surface">iPhone:</strong> Ajustes › Safari › Cámara ›
                Permitir.
              </li>
              <li>
                <strong className="text-on-surface">Android:</strong> toca el ícono junto a la
                dirección de la página › Permisos › Cámara.
              </li>
            </ul>
          </div>
        ) : (
          <p className="font-semibold text-on-surface-muted">
            Puede que otra app la esté usando o que este dispositivo no tenga cámara.
          </p>
        )}
      </div>
      <div className="space-y-3">
        <Button fullWidth onClick={onType}>
          Escribir el código
        </Button>
        <Button fullWidth variant="secondary" onClick={onRetry}>
          Intentar de nuevo
        </Button>
      </div>
    </div>
  )
}

/** HU-08 CA4, and OFF not answering (design §4). */
function ResultSheet({
  code,
  result,
  forward,
  onRetry,
  onScanAnother,
}: {
  code: string
  result: Exclude<BarcodeLookup, { kind: 'found' }>
  forward: ReturnType<typeof useForwardParams>
  onRetry: () => void
  onScanAnother: () => void
}) {
  const hint = result.kind === 'missing' ? result.hint : null
  const createHref = `/foods/new${forward({ barcode: code, name: hint?.name, brand: hint?.brand })}`
  const unavailable = result.kind === 'unavailable'

  return (
    <Sheet
      open
      onClose={onScanAnother}
      title={unavailable ? 'No pudimos consultar ahora' : 'No encontramos este producto'}
    >
      <div className="space-y-4">
        <p className="font-bold text-ink-muted tabular-nums">Código {formatBarcode(code)}</p>
        <p className="font-semibold text-ink-soft">
          {unavailable
            ? 'Revisa tu conexión o inténtalo en un rato. También puedes agregarlo copiando la tabla nutricional de la etiqueta.'
            : hint
              ? 'Encontramos el producto, pero le faltan datos de su tabla nutricional. Complétalos copiando la etiqueta y queda guardado con este código.'
              : 'Agrégalo copiando la tabla nutricional de la etiqueta. Queda guardado con este código para la próxima vez.'}
        </p>
        <div className="space-y-3">
          <Link to={createHref} replace className={buttonClasses({ fullWidth: true })}>
            Crear alimento con este código
          </Link>
          {unavailable ? (
            <Button fullWidth variant="secondary" onClick={onRetry}>
              Intentar de nuevo
            </Button>
          ) : (
            <Link
              to={`/add${forward({ q: hint?.name })}`}
              replace
              className={buttonClasses({ variant: 'secondary', fullWidth: true })}
            >
              Buscar por nombre
            </Link>
          )}
          <Button fullWidth variant="ghost" onClick={onScanAnother}>
            Escanear otro
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
