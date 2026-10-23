import { Plus } from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import { localDate } from '@/domain/dates'
import {
  MIN_WEIGHTS_FOR_CHART,
  PERIOD_DAYS,
  weekKcal,
  weightPeriod,
  type Period,
} from '@/domain/progress'
import type { WeightEntry } from '@/domain/trend'
import { useAuth } from '@/features/auth/useAuth'
import { DEFAULT_TIME_ZONE, useProfile } from '@/features/profile/useProfile'
import { formatDay, formatKcal, formatKg } from '@/lib/format'
import { BottomNav, Button, Card, Segmented, Toast, type SegmentedOption } from '@/ui'
import { useWeekLogs, useWeightHistory } from './api'
import { KcalChart } from './KcalChart'
import { WeightChart } from './WeightChart'
import { WeightSheet } from './WeightSheet'

const periodOptions: ReadonlyArray<SegmentedOption<Period>> = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'quarter', label: '3 meses' },
]

/** "−1,2 kg en 30 días", with a real minus sign. */
function formatChange(changeKg: number, period: Period) {
  const rounded = Math.round(changeKg * 10) / 10
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : ''
  return `${sign}${formatKg(Math.abs(rounded))} kg en ${PERIOD_DAYS[period]} días`
}

/** Progreso (HU-13, HU-14): weight trend over a period and the kcal of the week. */
export function ProgressPage() {
  const auth = useAuth()
  const profile = useProfile(auth.status === 'signedIn' ? auth.session.user.id : undefined)
  const timeZone = profile.data?.timezone ?? DEFAULT_TIME_ZONE
  const today = localDate(new Date(), timeZone)
  const [period, setPeriod] = useState<Period>('month')
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])

  const history = useWeightHistory()
  const entries = history.data ?? []
  const latest = entries.at(-1) ?? null
  const todayKg = latest?.date === today ? latest.weightKg : null

  return (
    <>
      <main className="mx-auto min-h-dvh max-w-md space-y-4 px-4 pt-6 pb-32">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-extrabold">Progreso</h1>
          <Segmented
            label="Período"
            options={periodOptions}
            value={period}
            onChange={setPeriod}
            className="min-w-60 flex-1"
          />
        </header>

        <Card radius="lg" className="space-y-4">
          <WeightSummary
            entries={entries}
            today={today}
            period={period}
            loaded={history.isSuccess}
            action={
              <Button
                size="md"
                icon={<Plus aria-hidden="true" />}
                onClick={() => setOpen(true)}
                className="shrink-0"
              >
                Registrar peso
              </Button>
            }
          />
          {history.isSuccess && <WeightBody entries={entries} today={today} period={period} />}
        </Card>

        <WeekCard today={today} targetKcal={profile.data?.kcal_target ?? null} />
      </main>

      <WeightSheet
        open={open}
        onClose={() => setOpen(false)}
        onSaved={(weightKg) => {
          setOpen(false)
          setNotice(`Guardamos ${formatKg(weightKg)} kg para hoy`)
        }}
        timeZone={timeZone}
        todayKg={todayKg}
        latestKg={latest?.weightKg ?? null}
      />
      {notice && <Toast message={notice} onDismiss={dismissNotice} />}
      <BottomNav />
    </>
  )
}

type WeightProps = {
  entries: readonly WeightEntry[]
  today: string
  period: Period
}

function Kg({ value }: { value: number }) {
  return (
    <p className="whitespace-nowrap">
      <span className="text-5xl font-extrabold">{formatKg(value)}</span>{' '}
      <span className="text-xl font-bold text-on-surface-muted">kg</span>
    </p>
  )
}

/**
 * HU-14 CA2: the trend is the headline, with its change in the period. With
 * too few weights for a trend, the latest weight instead.
 */
function WeightSummary({
  entries,
  today,
  period,
  loaded,
  action,
}: WeightProps & { loaded: boolean; action: ReactNode }) {
  const { points, changeKg } = weightPeriod(entries, today, period)
  const latest = entries.at(-1)
  const hasTrend = points.length >= MIN_WEIGHTS_FOR_CHART

  return (
    <div>
      {/* The button sits beside the label only, so the numbers get the full width. */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-on-surface-muted">
          {hasTrend ? 'Peso (tendencia)' : 'Peso'}
        </h2>
        {action}
      </div>
      {!loaded ? null : hasTrend ? (
        <>
          <Kg value={points.at(-1)!.trendKg} />
          <p className="font-extrabold text-accent">{formatChange(changeKg, period)}</p>
        </>
      ) : latest ? (
        <>
          <Kg value={latest.weightKg} />
          <p className="font-semibold text-on-surface-muted">
            {latest.date === today
              ? 'Registrado hoy'
              : `Último registro: ${formatDay(latest.date)}`}
          </p>
        </>
      ) : (
        <p className="font-semibold text-on-surface-muted">Aún no registras tu peso.</p>
      )}
    </div>
  )
}

/** The chart, or HU-14 CA4: an invitation while there are fewer than 3 weights. */
function WeightBody({ entries, today, period }: WeightProps) {
  const { points } = weightPeriod(entries, today, period)
  if (points.length >= MIN_WEIGHTS_FOR_CHART) {
    return <WeightChart points={points} today={today} days={PERIOD_DAYS[period]} />
  }
  const missing = MIN_WEIGHTS_FOR_CHART - points.length
  return (
    <p className="rounded-card bg-surface-2 p-4 font-semibold text-on-surface-muted">
      {missing === MIN_WEIGHTS_FOR_CHART
        ? 'Registra tu peso al menos 3 días en este período para ver tu tendencia.'
        : `Te ${missing === 1 ? 'falta 1 registro' : `faltan ${missing} registros`} en este período para ver tu tendencia.`}
    </p>
  )
}

/** HU-14 CA3: kcal of the last 7 days against the target. */
function WeekCard({ today, targetKcal }: { today: string; targetKcal: number | null }) {
  const logs = useWeekLogs(today)
  const { days, averageKcal } = weekKcal(logs.data ?? [], today)

  return (
    <Card radius="lg" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="text-xl font-extrabold">Calorías esta semana</h2>
        {averageKcal !== null && (
          <p className="font-bold whitespace-nowrap text-on-surface-muted">
            Promedio {formatKcal(averageKcal)}
          </p>
        )}
      </div>
      {logs.isSuccess && averageKcal === null ? (
        <p className="rounded-card bg-surface-2 p-4 font-semibold text-on-surface-muted">
          Aún no registras comidas esta semana.
        </p>
      ) : (
        <KcalChart days={days} targetKcal={targetKcal} />
      )}
    </Card>
  )
}
