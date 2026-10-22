import { render, screen } from '@testing-library/react'
import { Ring } from './Ring'

describe('Ring', () => {
  it('exposes its progress through the label', () => {
    render(<Ring progress={0.5} label="913 kcal restantes de 2.100" />)
    expect(screen.getByRole('img', { name: '913 kcal restantes de 2.100' })).toBeInTheDocument()
  })
})
