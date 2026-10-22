import { render, screen } from '@testing-library/react'
import { Sheet } from './Sheet'

describe('Sheet', () => {
  it('is a dialog named by its title only while open', () => {
    const { rerender } = render(
      <Sheet open={false} onClose={() => {}} title="Marraqueta">
        <p>Contenido</p>
      </Sheet>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    rerender(
      <Sheet open onClose={() => {}} title="Marraqueta">
        <p>Contenido</p>
      </Sheet>,
    )
    expect(screen.getByRole('dialog', { name: 'Marraqueta' })).toBeInTheDocument()
  })

  it('notifies the parent when the dialog closes itself', () => {
    const onClose = vi.fn()
    render(
      <Sheet open onClose={onClose} title="Marraqueta">
        <p>Contenido</p>
      </Sheet>,
    )
    screen.getByRole('dialog').dispatchEvent(new Event('close'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not call onClose when the parent closes it', () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <Sheet open onClose={onClose} title="Marraqueta">
        <p>Contenido</p>
      </Sheet>,
    )
    rerender(
      <Sheet open={false} onClose={onClose} title="Marraqueta">
        <p>Contenido</p>
      </Sheet>,
    )
    expect(onClose).not.toHaveBeenCalled()
  })
})
