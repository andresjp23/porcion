import { render, screen } from '@testing-library/react'
import { Search } from 'lucide-react'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('shows a heading, description and action', () => {
    render(
      <EmptyState
        icon={<Search aria-hidden="true" />}
        title="Aún no hay favoritos"
        description="Marca la estrella en un alimento."
        action={<button type="button">Buscar alimentos</button>}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Aún no hay favoritos' })).toBeInTheDocument()
    expect(screen.getByText('Marca la estrella en un alimento.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buscar alimentos' })).toBeInTheDocument()
  })
})
