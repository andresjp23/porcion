import { render, screen } from '@testing-library/react'
import { DevUiPage } from './DevUiPage'

describe('DevUiPage', () => {
  it('shows the core surface tokens', () => {
    render(<DevUiPage />)
    expect(screen.getByRole('heading', { name: 'Sistema visual' })).toBeInTheDocument()
    for (const token of ['bg', 'surface', 'accent']) {
      expect(screen.getByText(token, { exact: true })).toBeInTheDocument()
    }
  })
})
