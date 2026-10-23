// Calendar dates in the user's time zone. Days are ISO strings (YYYY-MM-DD) so
// they compare and sort as text and never shift with UTC.

/** The calendar date of an instant in an IANA time zone, e.g. "America/Santiago". */
export function localDate(instant: Date, timeZone: string) {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
}

/** The ISO date `days` after (or before, if negative) another one: no time zones involved. */
export function addDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number)
  const shifted = new Date(Date.UTC(year!, month! - 1, day! + days))
  return shifted.toISOString().slice(0, 10)
}

/** Whether a string is a real calendar date in ISO form (YYYY-MM-DD). */
export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value, 0) === value
}
