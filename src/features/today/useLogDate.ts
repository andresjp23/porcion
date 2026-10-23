import { useSearchParams } from 'react-router'
import { isIsoDate, localDate } from '@/domain/dates'
import { useTimeZone } from '@/features/profile/useProfile'

/**
 * The day being viewed or logged to: `?date=` (HU-03 CA3), else today in the
 * user's time zone. Future days are not allowed, so they fall back to today.
 */
export function useLogDate() {
  const [params] = useSearchParams()
  const today = localDate(new Date(), useTimeZone())
  const param = params.get('date')
  // ISO dates compare as text.
  const date = param && isIsoDate(param) && param <= today ? param : today
  return { date, today, isToday: date === today }
}
