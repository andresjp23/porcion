import {
  ChevronLeft,
  ChevronRight,
  Leaf,
  Moon,
  Plus,
  Repeat,
  Soup,
  Sun,
  SearchX,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useId, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { addDays } from '@/domain/dates'
import { dayBalance } from '@/domain/day'
import type { Meal } from '@/domain/meal'
import { sumNutrients, type Nutrients } from '@/domain/nutrition'
import { useAuth } from '@/features/auth/useAuth'
import { useProfile } from '@/features/profile/useProfile'
import { cx } from '@/lib/cx'
import { formatDay, formatGrams, formatKcal } from '@/lib/format'
import { MEALS } from '@/lib/meals'
import { BottomNav, Button, Card, EmptyState, IconButton, MacroBar, Ring, Toast } from '@/ui'
import { focusRing, pressable } from '@/ui/styles'
import {
  useAddLog,
  useCopyMeal,
  useDayLogs,
  useDeleteLog,
  useHasLogged,
  type LogEntry,
} from './api'
import { LogSheet } from './LogSheet'
import { useLogDate } from './useLogDate'

const MEAL_ICONS: Record<Meal, LucideIcon> = {
  breakfast: Sun,
  lunch: Soup,
  snack: Leaf,
  dinner: Moon,
}

type Targets = { kcal: number; protein: number; carbs: number; fat: number }

/** Hoy (HU-03): the day against the target, and its four meals. */
export function TodayPage() {
  const { date, today, isToday } = useLogDate()
  const auth = useAuth()
  const profile = useProfile(auth.status === 'signedIn' ? auth.session.user.id : undefined)
  const logs = useDayLogs(date)
  // HU-07 CA1: only today offers to repeat yesterday.
  const yesterday = addDays(today, -1)
  const yesterdayLogs = useDayLogs(yesterday, isToday)
  const hasLogged = useHasLogged()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<LogEntry | null>(null)
  const [notice, setNotice] = useState<{ message: string; undo?: LogEntry } | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])
  const deleteLog = useDeleteLog(date)
  const addLog = useAddLog()

  function remove(entry: LogEntry) {
    setSelected(null)
    deleteLog.mutate(entry, {
      onError: () => setNotice({ message: `No pudimos eliminar ${entry.foodName}.` }),
    })
    setNotice({ message: `Eliminaste ${entry.foodName}`, undo: entry })
  }

  // HU-06 CA2: back in its place, with the same id and time.
  function undo(entry: LogEntry) {
    setNotice(null)
    addLog.mutate(
      {
        id: entry.id,
        createdAt: entry.createdAt,
        date,
        meal: entry.meal,
        foodId: entry.foodId,
        portionId: entry.portionId,
        quantity: entry.quantity,
        grams: entry.grams,
        foodName: entry.foodName,
        nutrients: entry.nutrients,
      },
      { onError: () => setNotice({ message: `No pudimos recuperar ${entry.foodName}.` }) },
    )
  }

  const p = profile.data
  // Onboarding (HU-02) always leaves a target; the fallback only covers a profile being edited.
  const targets: Targets | null =
    p?.kcal_target != null
      ? {
          kcal: p.kcal_target,
          protein: p.protein_g ?? 0,
          carbs: p.carbs_g ?? 0,
          fat: p.fat_g ?? 0,
        }
      : null

  const goTo = (day: string) => void navigate(day === today ? '/' : `/?date=${day}`)
  const consumed = logs.data ? sumNutrients(logs.data.map((entry) => entry.nutrients)) : null
  const over = consumed && targets && dayBalance(consumed.kcal, targets.kcal).status === 'over'
  // R-08: never a reproach, also in the heading.
  const heading = !isToday
    ? date === yesterday
      ? 'Ayer'
      : 'Tu día'
    : over
      ? 'Así va tu día'
      : 'Hoy vas bien'

  return (
    <>
      <main className="mx-auto min-h-dvh max-w-md space-y-4 px-4 pt-6 pb-32">
        <header className="space-y-1">
          <DayPicker date={date} today={today} onChange={goTo} />
          <h1 className="text-3xl font-extrabold">{heading}</h1>
          {!isToday && (
            <Link
              to="/"
              className={cx(
                'inline-block font-extrabold text-ink underline underline-offset-4',
                focusRing,
              )}
            >
              Volver a hoy
            </Link>
          )}
        </header>

        {logs.data ? (
          <>
            {targets && consumed && <SummaryCard consumed={consumed} targets={targets} />}
            {isToday && hasLogged.data === false && logs.data.length === 0 && <FirstDayWelcome />}
            <ul className="space-y-2">
              {MEALS.map(({ value, label }) => (
                <li key={value}>
                  <MealCard
                    meal={value}
                    label={label}
                    date={date}
                    isToday={isToday}
                    entries={logs.data.filter((entry) => entry.meal === value)}
                    onSelectEntry={setSelected}
                    yesterday={
                      isToday
                        ? (yesterdayLogs.data ?? []).filter((entry) => entry.meal === value)
                        : []
                    }
                  />
                </li>
              ))}
            </ul>
          </>
        ) : logs.isError ? (
          <EmptyState
            icon={<SearchX aria-hidden="true" />}
            title="No pudimos cargar tu día"
            description="Revisa tu conexión e inténtalo de nuevo."
            action={
              <Button variant="secondary" onClick={() => void logs.refetch()}>
                Reintentar
              </Button>
            }
          />
        ) : (
          <p className="px-1 font-semibold text-ink-muted">Cargando tu día…</p>
        )}
        <LogSheet
          entry={selected}
          date={date}
          onClose={() => setSelected(null)}
          onDelete={remove}
        />
        {notice && (
          <Toast
            message={notice.message}
            onDismiss={dismissNotice}
            durationMs={5000}
            action={
              notice.undo && (
                <button
                  type="button"
                  onClick={() => notice.undo && undo(notice.undo)}
                  className={cx(
                    'min-h-11 shrink-0 rounded-pill px-3 font-extrabold text-accent',
                    focusRing,
                  )}
                >
                  Deshacer
                </button>
              )
            }
          />
        )}
      </main>
      <BottomNav />
    </>
  )
}

/** HU-03 CA3: previous and next day, or any past date from the native picker. */
function DayPicker({
  date,
  today,
  onChange,
}: {
  date: string
  today: string
  onChange: (date: string) => void
}) {
  return (
    <div className="-ml-2 flex items-center gap-1">
      <IconButton
        label="Día anterior"
        icon={<ChevronLeft aria-hidden="true" />}
        variant="subtle"
        className="bg-transparent text-ink"
        onClick={() => onChange(addDays(date, -1))}
      />
      <label className="relative font-bold text-ink-muted">
        <span>{formatDay(date)}</span>
        <input
          type="date"
          aria-label="Elegir día"
          value={date}
          max={today}
          onChange={(event) => {
            if (event.target.value) onChange(event.target.value)
          }}
          className={cx('absolute inset-0 cursor-pointer opacity-0', focusRing)}
        />
      </label>
      <IconButton
        label="Día siguiente"
        icon={<ChevronRight aria-hidden="true" />}
        variant="subtle"
        className="bg-transparent text-ink"
        disabled={date >= today}
        onClick={() => onChange(addDays(date, 1))}
      />
    </div>
  )
}

function SummaryCard({ consumed, targets }: { consumed: Nutrients; targets: Targets }) {
  const balance = dayBalance(consumed.kcal, targets.kcal)
  const shown = formatKcal(balance.status === 'under' ? balance.remaining : balance.over)

  return (
    <Card radius="lg" className="space-y-6">
      <div className="flex items-center gap-4">
        <Ring
          progress={targets.kcal > 0 ? consumed.kcal / targets.kcal : 0}
          label={`${formatKcal(consumed.kcal)} de ${formatKcal(targets.kcal)} kcal`}
          size={148}
          strokeWidth={12}
        >
          {/* "1.240" needs a smaller size than "913" to stay inside the ring. */}
          <span
            className={cx(
              'leading-none font-extrabold tabular-nums',
              shown.length > 3 ? 'text-3xl' : 'text-4xl',
            )}
          >
            {shown}
          </span>
          {/* R-08: neutral wording past the target, never red. */}
          <span className="mt-1 max-w-24 text-sm leading-tight font-bold text-on-surface-muted">
            {balance.status === 'under' ? 'restantes' : 'sobre la meta'}
          </span>
        </Ring>
        <dl className="min-w-0 space-y-3">
          <div>
            <dt className="text-sm font-bold text-on-surface-muted">Consumidas</dt>
            <dd className="text-on-surface-muted">
              <span className="text-3xl font-extrabold text-on-surface tabular-nums">
                {formatKcal(consumed.kcal)}
              </span>{' '}
              kcal
            </dd>
          </div>
          <div>
            <dt className="text-sm font-bold text-on-surface-muted">Meta diaria</dt>
            <dd className="text-on-surface-muted">
              <span className="text-3xl font-extrabold text-on-surface tabular-nums">
                {formatKcal(targets.kcal)}
              </span>{' '}
              kcal
            </dd>
          </div>
        </dl>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <MacroBar macro="protein" value={consumed.protein} target={targets.protein} />
        <MacroBar macro="carbs" value={consumed.carbs} target={targets.carbs} />
        <MacroBar macro="fat" value={consumed.fat} target={targets.fat} />
      </div>
    </Card>
  )
}

function MealCard({
  meal,
  label,
  date,
  isToday,
  entries,
  onSelectEntry,
  yesterday,
}: {
  meal: Meal
  label: string
  date: string
  isToday: boolean
  entries: LogEntry[]
  onSelectEntry: (entry: LogEntry) => void
  /** This meal yesterday, when Repetir applies (HU-07). */
  yesterday: LogEntry[]
}) {
  const [expanded, setExpanded] = useState(false)
  const listId = useId()
  const Icon = MEAL_ICONS[meal]
  const kcal = sumNutrients(entries.map((entry) => entry.nutrients)).kcal
  // Each food once, in the order it was logged.
  const summary = [...new Set(entries.map((entry) => entry.foodName))].join(', ')
  const addParams = new URLSearchParams({ meal })
  if (!isToday) addParams.set('date', date)
  const open = expanded && entries.length > 0

  const header = (
    <>
      <span
        aria-hidden="true"
        className="grid size-12 shrink-0 place-items-center rounded-icon bg-surface-2"
      >
        <Icon className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-extrabold">{label}</span>
        <span className="block truncate text-sm font-semibold text-on-surface-muted">
          {summary || 'Aún sin registros'}
        </span>
      </span>
      {entries.length > 0 && (
        <span className="shrink-0 text-lg font-extrabold tabular-nums">
          {formatKcal(kcal)}
          <span className="sr-only"> kcal</span>
        </span>
      )}
    </>
  )

  return (
    <section
      aria-label={label}
      className="rounded-card border border-surface-2 bg-surface p-3 text-on-surface"
    >
      <div className="flex items-center gap-3">
        {entries.length > 0 ? (
          // HU-06 CA1: the meal opens its list, and each food its sheet.
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setExpanded(!expanded)}
            className={cx(
              'flex min-w-0 flex-1 items-center gap-3 rounded-icon text-left',
              focusRing,
            )}
          >
            {header}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">{header}</div>
        )}
        <Link
          to={`/add?${addParams.toString()}`}
          aria-label={`Agregar a ${label}`}
          className={cx(
            'grid size-12 shrink-0 place-items-center rounded-full',
            // An empty meal is the next thing to log, so its "+" is the yellow action (mockup "Hoy").
            entries.length === 0 ? 'bg-accent text-on-accent' : 'bg-surface-2 text-accent',
            focusRing,
            pressable,
          )}
        >
          <Plus aria-hidden="true" className="size-6" />
        </Link>
      </div>
      {entries.length === 0 && yesterday.length > 0 && (
        <RepeatYesterday date={date} meal={meal} label={label} yesterday={yesterday} />
      )}
      {open && (
        <ul id={listId} className="mt-3 space-y-1 border-t border-surface-2 pt-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onSelectEntry(entry)}
                className={cx(
                  'flex min-h-11 w-full items-center justify-between gap-3 rounded-field px-2 text-left',
                  focusRing,
                  pressable,
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-bold">{entry.foodName}</span>
                  <span className="block text-sm font-semibold text-on-surface-muted">
                    {formatGrams(entry.grams)} g
                  </span>
                </span>
                <span className="shrink-0 font-extrabold tabular-nums">
                  {formatKcal(entry.nutrients.kcal)} kcal
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** HU-07: an empty meal of today repeats what was eaten at that meal yesterday. */
function RepeatYesterday({
  date,
  meal,
  label,
  yesterday,
}: {
  date: string
  meal: Meal
  label: string
  yesterday: LogEntry[]
}) {
  const copy = useCopyMeal(date)
  const summaryId = useId()
  const kcal = sumNutrients(yesterday.map((entry) => entry.nutrients)).kcal
  const foods = [...new Set(yesterday.map((entry) => entry.foodName))].join(', ')

  return (
    <div className="mt-3 space-y-2 border-t border-surface-2 pt-3">
      <Button
        variant="secondary"
        size="md"
        fullWidth
        className="bg-surface-2"
        icon={<Repeat aria-hidden="true" className="size-5 text-accent" />}
        aria-describedby={summaryId}
        disabled={copy.isPending}
        onClick={() => copy.mutate({ fromDate: addDays(date, -1), meal })}
      >
        {copy.isPending ? 'Repitiendo…' : 'Repetir lo de ayer'}
      </Button>
      <p id={summaryId} className="text-center text-sm font-semibold text-on-surface-muted">
        {copy.isError
          ? `No pudimos repetir ${label.toLowerCase()}. Inténtalo de nuevo.`
          : `${foods} · ${formatKcal(kcal)} kcal`}
      </p>
    </div>
  )
}

/** L-6: the first day, before anything was ever logged. */
function FirstDayWelcome() {
  const steps = [
    'Toca el + de una comida para agregar lo que comiste.',
    'Busca el alimento: da igual si escribes con o sin tildes.',
    '¿No está? Créalo con los datos de su etiqueta y queda para todos.',
    'Mañana podrás repetir una comida de hoy con un toque.',
  ]
  return (
    <section
      aria-labelledby="welcome-heading"
      className="space-y-4 rounded-card-lg border border-line p-5"
    >
      <div className="space-y-1">
        <h2 id="welcome-heading" className="text-xl font-extrabold">
          ¡Te damos la bienvenida!
        </h2>
        <p className="font-semibold text-ink-soft">Así registras tu día:</p>
      </div>
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 font-semibold text-ink-soft">
            <span
              aria-hidden="true"
              className="grid size-7 shrink-0 place-items-center rounded-full bg-surface text-sm font-extrabold text-accent"
            >
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-2">
        <Link
          to="/add"
          className={cx(
            'inline-flex h-[58px] items-center justify-center rounded-pill bg-accent px-6 text-lg font-extrabold text-on-accent',
            focusRing,
            pressable,
          )}
        >
          Agregar tu primera comida
        </Link>
        <Link
          to="/foods/new"
          className={cx(
            'inline-flex h-11 items-center justify-center rounded-pill bg-surface px-5 font-extrabold text-on-surface',
            focusRing,
            pressable,
          )}
        >
          Crear un alimento
        </Link>
      </div>
    </section>
  )
}
