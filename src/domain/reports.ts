// R-11: when a community food shows "Datos en revisión".

/** Open reports from which a food is shown as under review (HU-10 CA2). */
export const REVIEW_THRESHOLD = 3

/** Longest reason a report can have, as in food_reports. */
export const MAX_REPORT_REASON = 280

export function isUnderReview(openReports: number) {
  return openReports >= REVIEW_THRESHOLD
}
