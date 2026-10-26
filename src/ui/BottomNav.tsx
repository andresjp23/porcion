import { ChartLine, House, List, Plus, User, type LucideIcon } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { cx } from '@/lib/cx'
import { focusRing, pressable } from './styles'

type NavItem = { to: string; label: string; icon: LucideIcon }

const leftItems: NavItem[] = [
  { to: '/', label: 'Hoy', icon: House },
  { to: '/progress', label: 'Progreso', icon: ChartLine },
]

const rightItems: NavItem[] = [
  { to: '/foods', label: 'Alimentos', icon: List },
  { to: '/profile', label: 'Perfil', icon: User },
]

function NavItemLink({ to, label, icon: Icon }: NavItem) {
  return (
    <li className="flex-1">
      <NavLink
        to={to}
        end={to === '/'}
        className={({ isActive }) =>
          cx(
            'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-card text-sm font-bold',
            isActive ? 'text-accent' : 'text-on-surface',
            focusRing,
            pressable,
          )
        }
      >
        <Icon aria-hidden="true" className="size-6" strokeWidth={2} />
        {label}
      </NavLink>
    </li>
  )
}

/** Floating bottom navigation with the central "+" action (docs/ui.md). */
export function BottomNav() {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <ul className="mx-auto flex max-w-md items-center gap-1 rounded-card-lg border border-surface-2 bg-surface p-2 shadow-xl shadow-ink/20">
        {leftItems.map((item) => (
          <NavItemLink key={item.to} {...item} />
        ))}
        <li className="flex flex-1 justify-center">
          <Link
            to="/add"
            aria-label="Agregar comida"
            className={cx(
              'grid size-14 place-items-center rounded-full bg-accent text-on-accent shadow-lg shadow-accent/40',
              focusRing,
              pressable,
            )}
          >
            <Plus aria-hidden="true" className="size-7" strokeWidth={2.5} />
          </Link>
        </li>
        {rightItems.map((item) => (
          <NavItemLink key={item.to} {...item} />
        ))}
      </ul>
    </nav>
  )
}
