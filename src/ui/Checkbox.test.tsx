import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('is a checkbox named by its label that toggles', async () => {
    render(<Checkbox label="Soy mayor de 18 años" />)
    const checkbox = screen.getByRole('checkbox', { name: 'Soy mayor de 18 años' })
    await userEvent.click(screen.getByText('Soy mayor de 18 años'))
    expect(checkbox).toBeChecked()
  })

  it('links its error to the input', () => {
    render(<Checkbox label="Acepto" error="Debes aceptar para continuar" />)
    const checkbox = screen.getByRole('checkbox', { name: 'Acepto' })
    expect(checkbox).toHaveAttribute('aria-invalid', 'true')
    expect(checkbox).toHaveAccessibleDescription('Debes aceptar para continuar')
  })
})
