import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { focusRing, pressable } from './styles'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'lg' | 'md'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent shadow-lg shadow-ink/10',
  secondary: 'bg-surface text-on-surface',
  ghost: 'text-ink underline underline-offset-4',
}

const sizeClasses: Record<ButtonSize, string> = {
  lg: 'h-[58px] px-6 text-lg',
  md: 'h-11 px-5 text-base',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  icon,
  className,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex min-w-11 items-center justify-center gap-3 rounded-pill font-extrabold',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        focusRing,
        pressable,
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
