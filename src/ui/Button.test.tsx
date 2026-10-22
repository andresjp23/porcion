import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('is a button named by its text that does not submit forms by default', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Agregar a Almuerzo · 245 kcal</Button>)
    const button = screen.getByRole('button', { name: 'Agregar a Almuerzo · 245 kcal' })
    expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not fire when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Guardar
      </Button>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onClick).not.toHaveBeenCalled()
  })
})
