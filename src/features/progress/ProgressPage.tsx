import { Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { localDate } from '@/domain/dates'
import { useAuth } from '@/features/auth/useAuth'
import { useLatestWeight } from '@/features/onboarding/api'
import { DEFAULT_TIME_ZONE, useProfile } from '@/features/profile/useProfile'
import { formatDay, formatKg } from '@/lib/format'
import { BottomNav, Button, Card, Toast } from '@/ui'
import { WeightSheet } from './WeightSheet'

/**
 * Progreso, the tab of the bottom bar. For now only the weight of the day
 * (HU-13); the chart and the calories of the week come with G-2 (HU-14).
 */
export function ProgressPage() {
  const auth = useAuth()
  const userId = auth.status === 'signedIn' ? auth.session.user.id : undefined
  const profile = useProfile(userId)
  const timeZone = profile.data?.timezone ?? DEFAULT_TIME_ZONE
  const latest = useLatestWeight(userId)
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])

  const entry = latest.data ?? null
  const today = localDate(new Date(), timeZone)
  const todayKg = entry?.date === today ? entry.weight_kg : null

  return (
    <>
      <main className="mx-auto min-h-dvh max-w-md space-y-4 px-4 pt-6 pb-32">
        <h1 className="text-3xl font-extrabold">Progreso</h1>
        <Card radius="lg" className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-on-surface-muted">Peso</h2>
              {entry ? (
                <>
                  <p className="tabular-nums">
                    <span className="text-5xl font-extrabold">{formatKg(entry.weight_kg)}</span>{' '}
                    <span className="text-xl font-bold text-on-surface-muted">kg</span>
                  </p>
                  <p className="font-semibold text-on-surface-muted">
                    {entry.date === today
                      ? 'Registrado hoy'
                      : `Último registro: ${formatDay(entry.date)}`}
                  </p>
                </>
              ) : (
                latest.isSuccess && (
                  <p className="font-semibold text-on-surface-muted">Aún no registras tu peso.</p>
                )
              )}
            </div>
            <Button size="md" icon={<Plus aria-hidden="true" />} onClick={() => setOpen(true)}>
              Registrar peso
            </Button>
          </div>
        </Card>
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
        latestKg={entry?.weight_kg ?? null}
      />
      {notice && <Toast message={notice} onDismiss={dismissNotice} />}
      <BottomNav />
    </>
  )
}
