import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OptionCards } from './OptionCards'

const options = [
  { value: 'lose', title: 'Bajar de peso', description: 'Déficit moderado' },
  { value: 'maintain', title: 'Mantener mi peso' },
] as const

describe('OptionCards', () => {
  it('is a named radio group that reports the chosen value', async () => {
    const onChange = vi.fn()
    render(
      <OptionCards
        label="¿Cuál es tu objetivo?"
        options={options}
        value={undefined}
        onChange={onChange}
      />,
    )
    expect(screen.getByRole('group', { name: '¿Cuál es tu objetivo?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: /Mantener mi peso/ }))
    expect(onChange).toHaveBeenCalledWith('maintain')
  })

  it('marks the selected option as checked', () => {
    render(<OptionCards label="Objetivo" options={options} value="lose" onChange={vi.fn()} />)
    expect(screen.getByRole('radio', { name: /Bajar de peso/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Mantener mi peso/ })).not.toBeChecked()
  })

  it('links the error to the group', () => {
    render(
      <OptionCards
        label="Objetivo"
        options={options}
        value={undefined}
        onChange={vi.fn()}
        error="Elige una opción"
      />,
    )
    expect(screen.getByRole('group', { name: 'Objetivo' })).toHaveAccessibleDescription(
      'Elige una opción',
    )
  })
})
