import { useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, Keyboard } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { formatBarcode, type Barcode } from '@/domain/barcode'
import { localDate } from '@/domain/dates'
import { isCodeLabel, matchScan, summarizeSession } from '@/domain/shopping'
import { foodDisplayName } from '@/features/foods/serving'
import { useTimeZone } from '@/features/profile/useProfile'
import { lookupBarcode } from '@/features/scanner/api'
import { ScanFrame } from '@/features/scanner/ScanFrame'
import { TorchButton } from '@/features/scanner/TorchButton'
import { TypeCodeSheet } from '@/features/scanner/TypeCodeSheet'
import { useBarcodeScanner } from '@/features/scanner/useBarcodeScanner'
import { cx } from '@/lib/cx'
import { formatKcal } from '@/lib/format'
import { useGoBack } from '@/lib/useGoBack'
import { Button, buttonClasses, IconButton, Sheet } from '@/ui'
import { focusRing } from '@/ui/styles'
import {
  createList,
  scanIntoList,
  shoppingKeys,
  useActiveList,
  useFinishList,
  type ScanIntoList,
  type ShoppingItem,
  type ShoppingList,
} from './api'

/** "2026-10-23" → "Escaneo 23/10" (design: a session without a list gets one). */
function sessionListName(isoDate: string) {
  const [, month, day] = isoDate.split('-')
  return `Escaneo ${day}/${month}`
}

/** What a scan resolved to, before it is saved. */
type PendingScan = Omit<ScanIntoList, 'claimItemId'> & { hadList: boolean }

/**
 * Modo supermercado (HU-12): scans one product after another without leaving
 * the screen. Each one marks the item of the list it belongs to, raises the
 * quantity of a repeat, or joins the list as a new item. Without a list, the
 * first scan starts one named "Escaneo dd/mm".
 */
export function SupermarketPage() {
  const navigate = useNavigate()
  const goBack = useGoBack('/shopping')
  const queryClient = useQueryClient()
  const timeZone = useTimeZone()
  const active = useActiveList()

  const [busy, setBusy] = useState(false)
  const [typing, setTyping] = useState(false)
  const [question, setQuestion] = useState<{ scan: PendingScan; itemIds: string[] } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  // This visit only: what was scanned, newest first, and how many scans.
  const [sessionIds, setSessionIds] = useState<string[]>([])
  const [scanCount, setScanCount] = useState(0)
  const [summaryOpen, setSummaryOpen] = useState(false)

  const save = useCallback(
    async (scan: PendingScan, claimItemId: string | null, claimLabel?: string) => {
      try {
        const { itemId, outcome } = await scanIntoList({ ...scan, claimItemId })
        navigator.vibrate?.(50)
        setScanCount((n) => n + 1)
        setSessionIds((ids) => [itemId, ...ids.filter((id) => id !== itemId)])
        setMessage(
          outcome === 'repeat'
            ? `Sumaste otro: ${scan.label}`
            : outcome === 'claimed'
              ? `Marcaste ${claimLabel ?? scan.label} de tu lista`
              : scan.hadList
                ? `Agregaste ${scan.label} a tu lista`
                : `Agregaste ${scan.label}`,
        )
        await queryClient.invalidateQueries({ queryKey: shoppingKeys.active })
      } catch {
        setMessage('No pudimos guardar ese código. Revisa tu conexión e inténtalo de nuevo.')
      } finally {
        setBusy(false)
      }
    },
    [queryClient],
  )

  const onDetect = useCallback(
    async (barcode: Barcode) => {
      setBusy(true)
      setMessage(`Buscando ${formatBarcode(barcode.code)}…`)
      try {
        const lookup = await lookupBarcode(barcode.code, new AbortController().signal)
        // Not found, incomplete or OFF not answering: it stays pending (HU-12 CA4).
        const foodId = lookup.kind === 'found' ? lookup.foodId : null
        const name =
          lookup.kind === 'found'
            ? lookup.name
            : lookup.kind === 'missing' && lookup.hint?.name
              ? foodDisplayName({ name: lookup.hint.name, brand: lookup.hint.brand })
              : null

        const list = active.data
        const listId =
          list?.id ?? (await createList(sessionListName(localDate(new Date(), timeZone))))
        const scan: PendingScan = {
          listId,
          barcode: barcode.code,
          label: name ?? `Código ${formatBarcode(barcode.code)}`,
          foodId,
          hadList: Boolean(list && list.items.length > 0),
        }

        const match = matchScan(list?.items ?? [], { barcode: barcode.code, foodId, name })
        if (match.kind === 'ambiguous') {
          setMessage(null)
          setQuestion({ scan, itemIds: match.itemIds })
          return // still busy until the user answers
        }
        const claimed =
          match.kind === 'match' ? list?.items.find((item) => item.id === match.itemId) : undefined
        await save(scan, claimed?.id ?? null, claimed?.label)
      } catch {
        setMessage('No pudimos guardar ese código. Revisa tu conexión e inténtalo de nuevo.')
        setBusy(false)
      }
    },
    [active.data, save, timeZone],
  )

  const { videoRef, status, retry, torch } = useBarcodeScanner({
    onDetect: (barcode) => void onDetect(barcode),
    paused: busy || typing || summaryOpen || question !== null,
  })

  const list = active.data ?? null
  const sessionItems = sessionIds
    .map((id) => list?.items.find((item) => item.id === id))
    .filter((item): item is ShoppingItem => item !== undefined)
  const pendingCount = sessionItems.filter((item) => item.foodId === null).length
  const cameraProblem = status === 'denied' || status === 'unavailable'

  return (
    <main className="mx-auto min-h-dvh max-w-md space-y-4 px-4 pt-6 pb-32">
      <header className="flex items-center gap-3">
        <IconButton
          label="Volver"
          icon={<ChevronLeft aria-hidden="true" />}
          size="lg"
          onClick={goBack}
        />
        <h1 className="text-3xl font-extrabold">Modo supermercado</h1>
      </header>

      <section
        aria-label="Cámara"
        className="relative h-64 overflow-hidden rounded-card-lg border border-surface-2 bg-camera text-on-surface"
      >
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
        <div className="relative flex h-full flex-col items-center justify-between p-4">
          <div className="flex items-start justify-between self-stretch">
            <p className="inline-flex items-center gap-2 rounded-pill bg-camera/70 px-3 py-1 text-sm font-bold">
              <span aria-hidden="true" className="size-2.5 rounded-full bg-accent" />
              Escaneo continuo
            </p>
            {torch && <TorchButton on={torch.on} onToggle={torch.toggle} />}
          </div>
          {cameraProblem ? (
            <div className="space-y-3 text-center">
              <p className="font-bold">
                {status === 'denied'
                  ? 'Activa la cámara en los ajustes del navegador para escanear.'
                  : 'No pudimos abrir la cámara.'}
              </p>
              <Button size="md" variant="secondary" onClick={retry}>
                Intentar de nuevo
              </Button>
            </div>
          ) : (
            <ScanFrame className="h-24 w-56" />
          )}
          <p
            aria-live="polite"
            className="rounded-pill bg-camera/70 px-4 py-1 text-center font-bold"
          >
            {message ??
              (status === 'starting' ? 'Abriendo la cámara…' : 'Apunta al código de barras')}
          </p>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setTyping(true)}
        className={cx(
          'mx-auto flex min-h-11 items-center gap-2 rounded-pill px-4 font-extrabold underline underline-offset-4',
          focusRing,
        )}
      >
        <Keyboard aria-hidden="true" className="size-5" />
        Escribir el código
      </button>

      <SessionSummary scanCount={scanCount} pendingCount={pendingCount} />
      <SessionItems items={sessionItems} />
      {list && <StillToFind list={list} />}

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          fullWidth
          className="mx-auto max-w-md"
          onClick={() => (scanCount === 0 ? void navigate('/shopping') : setSummaryOpen(true))}
        >
          Listo
        </Button>
      </div>

      {list && (
        <SummarySheet
          open={summaryOpen}
          list={list}
          scanCount={scanCount}
          items={sessionItems}
          onKeepScanning={() => setSummaryOpen(false)}
          onLeave={() => void navigate('/shopping')}
        />
      )}

      {question && list && (
        <WhichItemSheet
          label={question.scan.label}
          items={list.items.filter((item) => question.itemIds.includes(item.id))}
          onPick={(item) => {
            setQuestion(null)
            void save(question.scan, item?.id ?? null, item?.label)
          }}
          onCancel={() => {
            setQuestion(null)
            setBusy(false)
            setMessage('Descartamos ese escaneo')
          }}
        />
      )}

      <TypeCodeSheet
        open={typing}
        onClose={() => setTyping(false)}
        onSubmit={(code) => {
          setTyping(false)
          void onDetect({ code, format: code.length === 8 ? 'ean_8' : 'ean_13' })
        }}
      />
    </main>
  )
}

function SessionSummary({ scanCount, pendingCount }: { scanCount: number; pendingCount: number }) {
  if (scanCount === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      <p className="inline-flex min-h-9 items-center rounded-chip bg-surface px-4 font-extrabold text-on-surface">
        {scanCount === 1 ? '1 escaneado' : `${scanCount} escaneados`}
      </p>
      {pendingCount > 0 && (
        <p className="inline-flex min-h-9 items-center rounded-chip bg-accent px-4 font-extrabold text-on-accent">
          {`${pendingCount} por completar`}
        </p>
      )}
    </div>
  )
}

/** What this visit scanned. Pending codes offer to complete them (HU-12 CA4). */
function SessionItems({ items }: { items: ShoppingItem[] }) {
  if (items.length === 0) return null
  return (
    <ul aria-label="Escaneados" className="space-y-2">
      {items.map((item) => {
        const name = item.food ? foodDisplayName(item.food) : item.label
        return (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-card border border-surface-2 bg-surface py-2 pr-2 pl-3 text-on-surface"
          >
            <span
              aria-hidden="true"
              className="grid size-11 shrink-0 place-items-center rounded-icon bg-surface-2 text-lg font-extrabold"
            >
              {name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex gap-1 font-extrabold">
                <span className="truncate">{name}</span>
                {/* Outside the truncated name, so a long name never hides it. */}
                {item.quantity > 1 && (
                  <span className="shrink-0 text-accent tabular-nums">× {item.quantity}</span>
                )}
              </p>
              {item.food ? (
                <p className="text-sm font-semibold text-on-surface-muted">
                  {`${formatKcal(item.food.kcal100)} kcal · 100 ${item.food.basis}`}
                </p>
              ) : (
                <p className="text-sm font-bold text-accent">Sin tabla nutricional</p>
              )}
            </div>
            {item.food ? (
              <span
                aria-label="Marcado"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-accent"
              >
                <Check aria-hidden="true" className="size-5" />
              </span>
            ) : (
              item.barcode && (
                <Link
                  to={completeHref(item.barcode, item.label)}
                  aria-label={`Completar ${item.label}`}
                  className={cx(buttonClasses({ size: 'md' }), 'shrink-0')}
                >
                  Completar
                </Link>
              )
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** With a list, what is still unchecked. */
function StillToFind({ list }: { list: ShoppingList }) {
  const left = list.items.filter((item) => item.checkedAt === null)
  if (left.length === 0) return null
  return (
    <p className="px-1 font-semibold text-ink-soft">
      <span className="font-extrabold text-ink">Te falta: </span>
      {left.map((item) => item.label).join(', ')}
    </p>
  )
}

/** HU-12 CA2: several items of the list fit the scanned product. */
/** HU-12 CA4: Crear alimento with the code, and the name when the scan knew it. */
function completeHref(barcode: string, label: string) {
  const params = new URLSearchParams({ barcode })
  if (!isCodeLabel(label)) params.set('name', label)
  return `/foods/new?${params.toString()}`
}

/** HU-12 CA5: what the session left, before leaving the supermarket mode. */
function SummarySheet({
  open,
  list,
  scanCount,
  items,
  onKeepScanning,
  onLeave,
}: {
  open: boolean
  list: ShoppingList
  scanCount: number
  items: ShoppingItem[]
  onKeepScanning: () => void
  onLeave: () => void
}) {
  const finishList = useFinishList()
  const summary = summarizeSession(scanCount, items)
  const pending = items.filter((item) => item.foodId === null && item.barcode !== null)
  const stats = [
    { label: summary.scanned === 1 ? 'Escaneado' : 'Escaneados', value: summary.scanned },
    { label: summary.completed === 1 ? 'Completado' : 'Completados', value: summary.completed },
    { label: 'Por completar', value: summary.pending },
  ]

  return (
    <Sheet open={open} onClose={onKeepScanning} title="Resumen de tu compra">
      <div className="space-y-4">
        <dl className="grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col-reverse rounded-card bg-surface p-3 text-center text-on-surface"
            >
              <dt className="text-sm font-bold text-on-surface-muted">{stat.label}</dt>
              <dd className="text-3xl font-extrabold tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>

        {pending.length > 0 && (
          <div className="space-y-2">
            <p className="font-semibold text-ink-soft">
              Los que no completes ahora quedan en Por completar, en Mis alimentos.
            </p>
            <ul className="space-y-2">
              {pending.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-card bg-surface py-2 pr-2 pl-4 text-on-surface"
                >
                  <span className="truncate font-bold">{item.label}</span>
                  <Link
                    to={completeHref(item.barcode!, item.label)}
                    aria-label={`Completar ${item.label}`}
                    className={cx(buttonClasses({ size: 'md' }), 'shrink-0')}
                  >
                    Completar
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {finishList.isError && (
          <p role="alert" className="font-bold text-ink">
            No pudimos terminar la lista. Inténtalo de nuevo.
          </p>
        )}
        <Button
          fullWidth
          disabled={finishList.isPending}
          onClick={() => finishList.mutate(list.id, { onSuccess: onLeave })}
        >
          Terminar lista
        </Button>
        <Button fullWidth variant="secondary" onClick={onLeave}>
          Dejarla para después
        </Button>
        <Button fullWidth variant="ghost" onClick={onKeepScanning}>
          Seguir escaneando
        </Button>
      </div>
    </Sheet>
  )
}

function WhichItemSheet({
  label,
  items,
  onPick,
  onCancel,
}: {
  label: string
  items: ShoppingItem[]
  /** `null`: none of them, add it on its own. */
  onPick: (item: ShoppingItem | null) => void
  onCancel: () => void
}) {
  return (
    <Sheet open onClose={onCancel} title="¿Cuál de tu lista es?">
      <div className="space-y-3">
        <p className="font-semibold text-ink-soft">{`Escaneaste ${label}.`}</p>
        {items.map((item) => (
          <Button key={item.id} fullWidth variant="secondary" onClick={() => onPick(item)}>
            {item.label}
          </Button>
        ))}
        <Button fullWidth variant="ghost" onClick={() => onPick(null)}>
          Ninguno, agregarlo aparte
        </Button>
      </div>
    </Sheet>
  )
}
