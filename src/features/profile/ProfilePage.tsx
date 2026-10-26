import { ChevronRight, LogOut } from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { localDate } from '@/domain/dates'
import { ageInYears, suggestedTarget } from '@/domain/energy'
import { checkTargetCoherence, macroEnergyShares, type Macros } from '@/domain/macros'
import {
  recalculateTarget,
  sameTarget,
  withSuggestedKcal,
  withSuggestedMacros,
  type SavedTarget,
} from '@/domain/target'
import { useAuth } from '@/features/auth/useAuth'
import { AdjustTargetSheet } from '@/features/onboarding/AdjustTargetSheet'
import { useLatestWeight } from '@/features/onboarding/api'
import { activityOptions, goalOptions, sexOptions } from '@/features/onboarding/options'
import { classifyTarget, targetInputFrom } from '@/features/onboarding/target'
import type { Tables } from '@/lib/database.types'
import { cx } from '@/lib/cx'
import { formatKcal, formatKg } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { BottomNav, Button, buttonClasses, Card, Toast } from '@/ui'
import { focusRing, pressable } from '@/ui/styles'
import { savedTargetFrom, targetColumns, useUpdateProfile } from './api'
import { useProfile } from './useProfile'

const SAVE_ERROR = 'No pudimos guardar tu meta. Revisa tu conexión e inténtalo de nuevo.'

const titleOf = <T extends string>(options: ReadonlyArray<{ value: T; title: string }>, value: T) =>
  options.find((option) => option.value === value)?.title ?? value

/** Perfil (HU-15): the daily target, the data it comes from, and signing out. */
export function ProfilePage() {
  const auth = useAuth()
  const userId = auth.session?.user.id
  const profile = useProfile(userId)
  const weight = useLatestWeight(userId)
  const [notice, setNotice] = useState<string | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])

  return (
    <>
      <main className="mx-auto min-h-dvh max-w-md space-y-4 px-4 pt-6 pb-32">
        <header>
          <h1 className="text-3xl font-extrabold">Perfil</h1>
          {auth.session?.user.email && (
            <p className="mt-1 font-semibold break-all text-ink-soft">{auth.session.user.email}</p>
          )}
        </header>

        {profile.data && weight.isSuccess && (
          <ProfileBody
            profile={profile.data}
            weightKg={weight.data?.weight_kg ?? null}
            onSaved={setNotice}
          />
        )}
        {(profile.isError || weight.isError) && (
          <div className="text-center">
            <p className="font-bold">No pudimos cargar tu perfil.</p>
            <Button
              size="md"
              className="mt-4"
              onClick={() => void Promise.all([profile.refetch(), weight.refetch()])}
            >
              Reintentar
            </Button>
          </div>
        )}

        <Button
          variant="ghost"
          size="md"
          icon={<LogOut aria-hidden="true" className="size-5" />}
          onClick={() => void supabase.auth.signOut()}
        >
          Cerrar sesión
        </Button>
      </main>
      {notice && <Toast message={notice} onDismiss={dismissNotice} />}
      <BottomNav />
    </>
  )
}

type ProfileBodyProps = {
  profile: Tables<'profiles'>
  weightKg: number | null
  onSaved: (notice: string) => void
}

function ProfileBody({ profile, weightKg, onSaved }: ProfileBodyProps) {
  const today = localDate(new Date(), profile.timezone)
  const input = targetInputFrom(profile, weightKg, today)
  const saved = savedTargetFrom(profile)
  const update = useUpdateProfile(profile.id)
  const [adjusting, setAdjusting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(next: SavedTarget, notice: string) {
    setError(null)
    try {
      await update.mutateAsync(targetColumns(next))
    } catch {
      setError(SAVE_ERROR)
      return
    }
    onSaved(notice)
  }

  // Finished onboarding always leaves both; guard anyway instead of crashing.
  if (!input || !saved) return <DataCard profile={profile} weightKg={weightKg} today={today} />

  const suggestedKcal = suggestedTarget(input).kcal
  const { next, kcalOffer, macrosOffer } = recalculateTarget(saved, suggestedKcal, input.weightKg)
  const outdated = !sameTarget(saved, next)

  return (
    <>
      <TargetCard target={saved} />

      {outdated && (
        <Notice
          text="Tus datos cambiaron desde el último cálculo de tu meta."
          action="Recalcular mi meta"
          onClick={() => void save(next, 'Recalculamos tu meta')}
          disabled={update.isPending}
        />
      )}
      {kcalOffer !== null && (
        <Notice
          text={`Fijaste tu meta a mano. Con tus datos, la sugerida es ${formatKcal(kcalOffer)} kcal.`}
          action={`Usar ${formatKcal(kcalOffer)} kcal`}
          onClick={() =>
            void save(
              withSuggestedKcal(next, suggestedKcal, input.weightKg),
              'Volviste a la meta sugerida',
            )
          }
          disabled={update.isPending}
        />
      )}
      {macrosOffer !== null && (
        <Notice
          text={`Fijaste tus macros a mano. Los sugeridos son ${formatMacros(macrosOffer)}.`}
          action="Usar los macros sugeridos"
          onClick={() =>
            void save(withSuggestedMacros(next, input.weightKg), 'Volviste a los macros sugeridos')
          }
          disabled={update.isPending}
        />
      )}
      {error && (
        <p role="alert" className="font-bold">
          {error}
        </p>
      )}

      <Button variant="secondary" size="md" fullWidth onClick={() => setAdjusting(true)}>
        Ajustar manualmente
      </Button>

      <DataCard profile={profile} weightKg={weightKg} today={today} />

      {adjusting && (
        <AdjustTargetSheet
          open
          onClose={() => setAdjusting(false)}
          sex={input.sex}
          weightKg={input.weightKg}
          suggestedKcal={suggestedKcal}
          current={saved}
          onApply={(values) =>
            void save(classifyTarget(values, suggestedKcal, input.weightKg), 'Guardamos tu meta')
          }
        />
      )}
    </>
  )
}

/** "128 g de proteína, 264 g de carbos y 75 g de grasas" */
function formatMacros({ protein, carbs, fat }: Macros) {
  return `${protein} g de proteína, ${carbs} g de carbos y ${fat} g de grasas`
}

function TargetCard({ target }: { target: SavedTarget }) {
  const shares = macroEnergyShares(target)
  const coherence = checkTargetCoherence(target, target.kcal)

  return (
    <Card radius="lg">
      <h2 className="font-bold text-on-surface-muted">
        {target.kcalIsManual ? 'Tu meta diaria (a mano)' : 'Tu meta diaria (sugerida)'}
      </h2>
      <p className="mt-1 flex items-baseline gap-3">
        <span className="text-5xl font-extrabold text-accent tabular-nums">
          {formatKcal(target.kcal)}
        </span>
        <span className="text-lg font-extrabold text-on-surface-muted">kcal al día</span>
      </p>

      <h3 className="mt-5 font-bold text-on-surface-muted">
        {target.macrosAreManual ? 'Tus macros (a mano)' : 'Macros sugeridos'}
      </h3>
      <div aria-hidden="true" className="mt-3 flex h-3 gap-1">
        <span className="rounded-pill bg-protein" style={{ flexGrow: shares.protein }} />
        <span className="rounded-pill bg-carbs" style={{ flexGrow: shares.carbs }} />
        <span className="rounded-pill bg-fat" style={{ flexGrow: shares.fat }} />
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2">
        {(
          [
            ['Proteína', target.protein, 'bg-protein'],
            ['Carbos', target.carbs, 'bg-carbs'],
            ['Grasas', target.fat, 'bg-fat'],
          ] as const
        ).map(([label, grams, color]) => (
          <div key={label}>
            <dt className="flex items-center gap-2 text-sm font-bold text-on-surface-muted">
              <span aria-hidden="true" className={`size-2.5 rounded-full ${color}`} />
              {label}
            </dt>
            <dd className="mt-1 text-2xl font-extrabold tabular-nums">{grams} g</dd>
          </div>
        ))}
      </dl>
      {!coherence.isCoherent && (
        <p className="mt-4 text-sm font-semibold text-on-surface-muted">
          Tus macros suman {formatKcal(coherence.kcalFromMacros)} kcal.
        </p>
      )}
    </Card>
  )
}

type NoticeProps = { text: string; action: string; onClick: () => void; disabled: boolean }

/** A neutral suggestion with one action, as in "Ajustar mi meta" (R-08: no red). */
function Notice({ text, action, onClick, disabled }: NoticeProps) {
  return (
    <div className="rounded-card border border-line p-4">
      <p className="font-semibold">{text}</p>
      <Button variant="secondary" size="md" className="mt-3" onClick={onClick} disabled={disabled}>
        {action}
      </Button>
    </div>
  )
}

type DataCardProps = { profile: Tables<'profiles'>; weightKg: number | null; today: string }

/** HU-15 CA1: the onboarding answers, editable at /profile/data. */
function DataCard({ profile, weightKg, today }: DataCardProps) {
  const rows: Array<[string, ReactNode]> = [
    ['Sexo para el cálculo', profile.sex ? titleOf(sexOptions, profile.sex) : '—'],
    ['Edad', profile.birth_date ? `${ageInYears(profile.birth_date, today)} años` : '—'],
    [
      'Estatura',
      profile.height_cm === null ? '—' : `${String(profile.height_cm).replace('.', ',')} cm`,
    ],
    ['Actividad', profile.activity ? titleOf(activityOptions, profile.activity) : '—'],
    ['Objetivo', profile.goal ? titleOf(goalOptions, profile.goal) : '—'],
  ]

  return (
    <Card radius="lg">
      <h2 className="text-lg font-extrabold">Tus datos</h2>
      <dl className="mt-4 space-y-3 font-bold">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-on-surface-muted">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4">
          <dt className="text-on-surface-muted">Peso</dt>
          <dd>
            <Link
              to="/progress"
              className={cx(
                'inline-flex min-h-11 items-center gap-1 rounded-pill underline underline-offset-4',
                focusRing,
                pressable,
              )}
            >
              {weightKg === null ? 'Registrar' : `${formatKg(weightKg)} kg`}
              <span className="sr-only">, se registra en Progreso</span>
              <ChevronRight aria-hidden="true" className="size-5" />
            </Link>
          </dd>
        </div>
      </dl>
      <Link
        to="/profile/data"
        className={cx(buttonClasses({ variant: 'primary', size: 'md', fullWidth: true }), 'mt-5')}
      >
        Editar mis datos
      </Link>
    </Card>
  )
}
