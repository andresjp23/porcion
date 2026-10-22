import { render, screen } from '@testing-library/react'
import { Input } from './Input'

describe('Input', () => {
  it('is labelled by its label', () => {
    render(<Input label="Nombre" />)
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toBeInTheDocument()
  })

  it('links the hint as its description', () => {
    render(<Input label="Marca" hint="Opcional" />)
    expect(screen.getByRole('textbox', { name: 'Marca' })).toHaveAccessibleDescription('Opcional')
  })

  it('marks errors as invalid and describes them', () => {
    render(<Input label="Energía (kcal)" error="Ingresa un número." />)
    const input = screen.getByRole('textbox', { name: 'Energía (kcal)' })
    expect(input).toBeInvalid()
    expect(input).toHaveAccessibleDescription('Ingresa un número.')
  })
})
