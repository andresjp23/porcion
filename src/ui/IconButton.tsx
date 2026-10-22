import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { focusRing, pressable } from './styles'

type IconButtonVariant = 'surface' | 'subtle' | 'accent'
type IconButtonSize = 'md' | 'lg'

const variantClasses: Record<IconButtonVariant, string> = {
  // On the bone background.
  surface: 'bg-surface text-accent border border-surface-2',
  // Inside graphite cards.
  subtle: 'bg-surface-2 text-accent',
  // The single most important action in a group.
  accent: 'bg-accent text-on-accent',
}

const sizeClasses: Record<IconButtonSize, string> = {
  md: 'size-11',
  lg: 'size-12',
}

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> & {
  /** Accessible name. Required because the button has no visible text. */
  label: string
  icon: ReactNode
  variant?: IconButtonVariant
  size?: IconButtonSize
}

export function IconButton({
  label,
  icon,
  variant = 'surface',
  size = 'md',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        variantClasses[variant],
        sizeClasses[size],
        focusRing,
        pressable,
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  )
}
