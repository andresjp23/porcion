/**
 * Shared interaction classes. The focus ring is an ink gap plus an accent ring,
 * so it stays visible on both the bone background and graphite cards.
 */
export const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink'

/** Tap feedback without moving the layout (docs/ui.md, Movimiento). */
export const pressable = 'transition duration-150 ease-out active:scale-[0.97] disabled:opacity-50'
