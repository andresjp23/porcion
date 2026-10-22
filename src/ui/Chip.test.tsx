import { render, screen } from '@testing-library/react'
import { Chip } from './Chip'

describe('Chip', () => {
  it('exposes its selected state with aria-pressed', () => {
    render(
      <>
        <Chip selected>Almuerzo</Chip>
        <Chip selected={false}>Cena</Chip>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Almuerzo' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Cena' })).toHaveAttribute('aria-pressed', 'false')
  })
})
