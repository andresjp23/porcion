import {
  ChevronLeft,
  ChevronRight,
  Leaf,
  Moon,
  Plus,
  Soup,
  Sun,
  SearchX,
  type LucideIcon,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { addDays } from '@/domain/dates'
import { dayBalance } from '@/domain/day'
import type { Meal } from '@/domain/meal'
import { sumNutrients, type Nutrients } from '@/domain/nutrition'
import { useAuth } from '@/features/auth/useAuth'
import { useProfile } from '@/features/profile/useProfile'
import { cx } from '@/lib/cx'
import { formatDay, formatKcal } from '@/lib/format'
import { MEALS } from '@/lib/meals'
import { BottomNav, Button, Card, EmptyState, IconButton, MacroBar, Ring } from '@/ui'
import { focusRing, pressable } from '@/ui/styles'
import { useDayLogs, type LogEntry } from './api'
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
  const navigate = useNavigate()

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
    ? date === addDays(today, -1)
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
            <ul className="space-y-2">
              {MEALS.map(({ value, label }) => (
                <li key={value}>
                  <MealCard
                    meal={value}
                    label={label}
                    date={date}
                    isToday={isToday}
                    entries={logs.data.filter((entry) => entry.meal === value)}
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

  return (
    <Card radius="lg" className="space-y-6">
      <div className="flex items-center gap-5">
        <Ring
          progress={targets.kcal > 0 ? consumed.kcal / targets.kcal : 0}
          label={`${formatKcal(consumed.kcal)} de ${formatKcal(targets.kcal)} kcal`}
        >
          <span className="text-4xl font-extrabold tabular-nums">
            {formatKcal(balance.status === 'under' ? balance.remaining : balance.over)}
          </span>
          {/* R-08: neutral wording past the target, never red. */}
          <span className="text-sm font-bold text-on-surface-muted">
            {balance.status === 'under' ? 'restantes' : 'sobre la meta'}
          </span>
        </Ring>
        <dl className="space-y-3">
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
}: {
  meal: Meal
  label: string
  date: string
  isToday: boolean
  entries: LogEntry[]
}) {
  const Icon = MEAL_ICONS[meal]
  const kcal = sumNutrients(entries.map((entry) => entry.nutrients)).kcal
  // Each food once, in the order it was logged.
  const summary = [...new Set(entries.map((entry) => entry.foodName))].join(', ')
  const addParams = new URLSearchParams({ meal })
  if (!isToday) addParams.set('date', date)

  return (
    <div className="flex items-center gap-3 rounded-card border border-surface-2 bg-surface p-3 text-on-surface">
      <span
        aria-hidden="true"
        className="grid size-12 shrink-0 place-items-center rounded-icon bg-surface-2"
      >
        <Icon className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-extrabold">{label}</h2>
        <p className="truncate text-sm font-semibold text-on-surface-muted">
          {summary || 'Aún sin registros'}
        </p>
      </div>
      {entries.length > 0 && (
        <p className="shrink-0 text-lg font-extrabold tabular-nums">
          {formatKcal(kcal)}
          <span className="sr-only"> kcal</span>
        </p>
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
  )
}
