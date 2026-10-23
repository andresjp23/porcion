// HU-03: how the day stands against the kcal target, without blame (R-08).

export type DayBalance = { status: 'under'; remaining: number } | { status: 'over'; over: number }

/** "restantes" while consumed ≤ target, "sobre la meta" past it (HU-03 CA4). */
export function dayBalance(consumedKcal: number, targetKcal: number): DayBalance {
  const difference = targetKcal - consumedKcal
  return difference >= 0
    ? { status: 'under', remaining: difference }
    : { status: 'over', over: -difference }
}
