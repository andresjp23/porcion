// R-09: default meal for the central "+" button, by local time of day.

export type Meal = 'breakfast' | 'lunch' | 'snack' | 'dinner'

export type TimeOfDay = {
  hour: number
  minute: number
}

/** Before 11:00 breakfast, 11:00–15:59 lunch, 16:00–19:29 snack, from 19:30 dinner. */
export function mealForTime({ hour, minute }: TimeOfDay): Meal {
  const minutes = hour * 60 + minute
  if (minutes < 11 * 60) return 'breakfast'
  if (minutes < 16 * 60) return 'lunch'
  if (minutes < 19 * 60 + 30) return 'snack'
  return 'dinner'
}

/** Hour and minute of an instant in an IANA time zone, e.g. "America/Santiago". */
export function timeOfDayIn(instant: Date, timeZone: string): TimeOfDay {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(instant)
  const get = (type: 'hour' | 'minute') => Number(parts.find((p) => p.type === type)?.value)
  return { hour: get('hour'), minute: get('minute') }
}

/** R-09 for an instant in the user's time zone. */
export function mealAt(instant: Date, timeZone: string) {
  return mealForTime(timeOfDayIn(instant, timeZone))
}
