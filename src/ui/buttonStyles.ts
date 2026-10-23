import { cx } from '@/lib/cx'
import { focusRing, pressable } from './styles'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'lg' | 'md'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent shadow-lg shadow-ink/10',
  secondary: 'bg-surface text-on-surface',
  ghost: 'text-ink underline underline-offset-4',
}

const sizeClasses: Record<ButtonSize, string> = {
  lg: 'h-[58px] px-6 text-lg',
  md: 'h-11 px-5 text-base',
}

/** Button look for elements that are not a <button>, such as a router <Link>. */
export function buttonClasses({
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
}: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean } = {}) {
  return cx(
    'inline-flex min-w-11 items-center justify-center gap-3 rounded-pill font-extrabold',
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && 'w-full',
    focusRing,
    pressable,
  )
}
