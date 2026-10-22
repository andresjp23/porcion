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
