import { useState } from 'react'
import { localDate } from '@/domain/dates'
import { KCAL_FLOORS, suggestedTarget, type ActivityLevel, type Goal } from '@/domain/energy'
import { checkTargetCoherence, macroEnergyShares, suggestedMacros } from '@/domain/macros'
import type { Tables } from '@/lib/database.types'
import { formatFactor, formatKcal } from '@/lib/format'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { AdjustTargetSheet } from './AdjustTargetSheet'
import { updateProfile } from './api'
import { StepLayout } from './StepLayout'
import { targetInputFrom, type DailyTarget } from './target'

type TargetStepProps = {
  profile: Tables<'profiles'>
  latestWeightKg: number | null
  onBack?: () => void
  /** Refreshes the profile and enters the app. */
  onDone: () => Promise<void>
}

const activityLabels: Record<ActivityLevel, string> = {
  sedentary: 'actividad sedentaria',
  light: 'actividad ligera',
  moderate: 'actividad moderada',
  high: 'actividad alta',
  very_high: 'actividad muy alta',
}

const goalLabels: Record<Goal, string> = {
  lose: 'bajar de peso',
  maintain: 'mantener tu peso',
  gain: 'subir de peso',
}

function formatAdjustment(kcal: number) {
  if (kcal === 0) return '0'
  return `${kcal > 0 ? '+' : '–'} ${formatKcal(Math.abs(kcal))}`
}

/** HU-02 CA3–CA4, step 5: the target with its breakdown, suggested macros, and manual adjustment. */
export function TargetStep({ profile, latestWeightKg, onBack, onDone }: TargetStepProps) {
  const input = targetInputFrom(profile, latestWeightKg, localDate(new Date(), profile.timezone))
  if (!input) throw new Error('TargetStep needs every onboarding answer')
  const breakdown = suggestedTarget(input)
  const suggested: DailyTarget = {
    kcal: breakdown.kcal,
    ...suggestedMacros(breakdown.kcal, input.weightKg),
    kcalIsManual: false,
    macrosAreManual: false,
  }

  return (
    <TargetView
      key={suggested.kcal}
      profile={profile}
      weightKg={input.weightKg}
      breakdown={breakdown}
      suggested={suggested}
      onBack={onBack}
      onDone={onDone}
    />
  )
}

type TargetViewProps = {
  profile: Tables<'profiles'>
  weightKg: number
  breakdown: ReturnType<typeof suggestedTarget>
  suggested: DailyTarget
  onBack?: () => void
  onDone: () => Promise<void>
}

function TargetView({ profile, weightKg, breakdown, suggested, onBack, onDone }: TargetViewProps) {
  const [target, setTarget] = useState(suggested)
  const [adjusting, setAdjusting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sex = profile.sex ?? 'female'
  const isManual = target.kcalIsManual || target.macrosAreManual
  const shares = macroEnergyShares(target)
  const coherence = checkTargetCoherence(target, target.kcal)

  async function start() {
    setError(null)
    setSaving(true)
    try {
      await updateProfile(profile.id, {
        kcal_target: target.kcal,
        protein_g: target.protein,
        carbs_g: target.carbs,
        fat_g: target.fat,
        kcal_is_manual: target.kcalIsManual,
        macros_are_manual: target.macrosAreManual,
        onboarding_completed_at: new Date().toISOString(),
      })
    } catch {
      setError('No pudimos guardar tu meta. Inténtalo de nuevo en un momento.')
      setSaving(false)
      return
    }
    await onDone()
  }

  return (
    <>
      <StepLayout
        step={5}
        title="Tu meta diaria"
        subtitle="Es una estimación para empezar. La afinamos con tu progreso."
        onBack={onBack}
        onSubmit={(event) => {
          event.preventDefault()
          void start()
        }}
        submitting={saving}
        error={error}
        submitLabel="Empezar"
        footer={
          <Button
            variant="ghost"
            size="md"
            className="mx-auto mt-3"
            onClick={() => setAdjusting(true)}
          >
            Ajustar manualmente
          </Button>
        }
      >
        <Card radius="lg">
          <p className="flex items-baseline gap-3">
            <span className="text-6xl font-extrabold text-accent tabular-nums">
              {formatKcal(target.kcal)}
            </span>
            <span className="text-lg font-extrabold text-on-surface-muted">kcal al día</span>
          </p>
          <dl className="mt-5 space-y-3 text-base font-bold">
            <div className="flex justify-between gap-4">
              <dt className="text-on-surface-muted">Metabolismo basal (Mifflin-St Jeor)</dt>
              <dd className="tabular-nums">{formatKcal(breakdown.bmr)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-on-surface-muted">
                × {formatFactor(breakdown.activityFactor)}{' '}
                {activityLabels[profile.activity ?? 'sedentary']}
              </dt>
              <dd className="tabular-nums">{formatKcal(breakdown.tdee)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-on-surface-muted">
                Objetivo: {goalLabels[profile.goal ?? 'maintain']}
              </dt>
              <dd className="tabular-nums">{formatAdjustment(breakdown.goalAdjustment)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-surface-2 pt-3">
              <dt>{target.kcalIsManual ? 'Meta ajustada a mano' : 'Meta diaria'}</dt>
              <dd className="text-accent tabular-nums">{formatKcal(target.kcal)} kcal</dd>
            </div>
          </dl>
          {breakdown.floorApplied && !target.kcalIsManual && (
            <p className="mt-4 text-sm font-semibold text-on-surface-muted">
              El cálculo daba menos, así que usamos {formatKcal(KCAL_FLOORS[sex])} kcal, el mínimo
              recomendado para empezar.
            </p>
          )}
          {target.kcalIsManual && (
            <p className="mt-4 text-sm font-semibold text-on-surface-muted">
              La meta sugerida era {formatKcal(suggested.kcal)} kcal.
            </p>
          )}
        </Card>

        <Card radius="lg" className="mt-3">
          <h2 className="text-base font-extrabold">
            {target.macrosAreManual ? 'Tus macros' : 'Macros sugeridos'}
          </h2>
          <div aria-hidden="true" className="mt-4 flex h-3 gap-1">
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

        {isManual && (
          <Button variant="ghost" size="md" className="mt-3" onClick={() => setTarget(suggested)}>
            Usar lo sugerido
          </Button>
        )}
      </StepLayout>

      {/* Outside StepLayout: the sheet has its own form, and forms cannot nest. */}
      {adjusting && (
        <AdjustTargetSheet
          open
          onClose={() => setAdjusting(false)}
          sex={sex}
          weightKg={weightKg}
          suggestedKcal={suggested.kcal}
          current={target}
          onApply={setTarget}
        />
      )}
    </>
  )
}
