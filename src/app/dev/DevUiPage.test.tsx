import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { DevUiPage } from './DevUiPage'

describe('DevUiPage', () => {
  it('shows the tokens and every base component', () => {
    render(
      <MemoryRouter>
        <DevUiPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Sistema visual' })).toBeInTheDocument()
    for (const token of ['bg', 'surface', 'accent']) {
      expect(screen.getByText(token, { exact: true })).toBeInTheDocument()
    }
    for (const component of ['Button', 'IconButton', 'Chip', 'Segmented', 'Stepper', 'FoodRow']) {
      expect(screen.getByRole('heading', { name: component })).toBeInTheDocument()
    }
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
  })
})
