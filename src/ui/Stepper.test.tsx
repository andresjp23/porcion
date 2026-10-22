import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Stepper } from './Stepper'

function Harness({ initial = 1 }: { initial?: number }) {
  const [value, setValue] = useState(initial)
  return <Stepper label="Cantidad" value={value} onChange={setValue} step={0.5} unit="unidad" />
}

describe('Stepper', () => {
  it('steps the value with labelled buttons', async () => {
    render(<Harness />)
    const field = screen.getByRole('textbox', { name: 'Cantidad' })
    await userEvent.click(screen.getByRole('button', { name: 'Sumar 0,5' }))
    expect(field).toHaveValue('1,5')
    await userEvent.click(screen.getByRole('button', { name: 'Restar 0,5' }))
    expect(field).toHaveValue('1')
  })

  it('does not step down to zero', () => {
    render(<Harness initial={0.5} />)
    expect(screen.getByRole('button', { name: 'Restar 0,5' })).toBeDisabled()
  })

  it('accepts a typed quantity with a decimal comma', async () => {
    render(<Harness />)
    const field = screen.getByRole('textbox', { name: 'Cantidad' })
    await userEvent.clear(field)
    await userEvent.type(field, '2,5{Enter}')
    expect(field).toHaveValue('2,5')
  })

  it('restores the previous value when the typed one is invalid', async () => {
    render(<Harness />)
    const field = screen.getByRole('textbox', { name: 'Cantidad' })
    await userEvent.clear(field)
    await userEvent.type(field, 'abc')
    await userEvent.tab()
    expect(field).toHaveValue('1')
  })
})
