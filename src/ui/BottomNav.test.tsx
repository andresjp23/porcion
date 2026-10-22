import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { BottomNav } from './BottomNav'

describe('BottomNav', () => {
  it('has the five destinations and marks the current one', () => {
    render(
      <MemoryRouter initialEntries={['/progress']}>
        <BottomNav />
      </MemoryRouter>,
    )
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.textContent || link.getAttribute('aria-label'))).toEqual([
      'Hoy',
      'Progreso',
      'Agregar comida',
      'Alimentos',
      'Perfil',
    ])
    expect(within(nav).getByRole('link', { name: 'Progreso' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav).getByRole('link', { name: 'Hoy' })).not.toHaveAttribute('aria-current')
  })
})
