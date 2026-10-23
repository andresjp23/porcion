import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles'

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
      className={cx(buttonClasses({ variant, size, fullWidth }), className)}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
