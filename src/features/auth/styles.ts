import { cx } from '@/lib/cx'
import { focusRing } from '@/ui/styles'

const link = 'rounded-sm font-bold underline underline-offset-4'

/** Text links inside graphite Cards: accent is readable there (docs/ui.md). */
export const linkOnSurface = cx(link, 'text-accent', focusRing)

/** Text links on the bone background: ink, never accent. */
export const linkOnBone = cx(link, 'text-ink', focusRing)
