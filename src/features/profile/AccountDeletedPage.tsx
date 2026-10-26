import { Link } from 'react-router'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { cx } from '@/lib/cx'
import { buttonClasses } from '@/ui'

/** After HU-16 CA2: open to everyone, since the session is gone. */
export function AccountDeletedPage() {
  return (
    <AuthLayout
      title="Eliminamos tu cuenta"
      subtitle="Borramos tu perfil y tus datos. Gracias por haber usado Porción."
    >
      <Link to="/login" className={cx(buttonClasses({ fullWidth: true }), 'mt-8')}>
        Ir al inicio
      </Link>
    </AuthLayout>
  )
}
