import { render, screen } from '@testing-library/react'
import { ChevronLeft } from 'lucide-react'
import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('uses its label as the accessible name', () => {
    render(<IconButton label="Volver" icon={<ChevronLeft aria-hidden="true" />} />)
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument()
  })
})
