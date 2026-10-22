import { render, screen } from '@testing-library/react'
import { MacroBar } from './MacroBar'

describe('MacroBar', () => {
  it('is a labelled progress bar with a readable value', () => {
    render(<MacroBar macro="protein" value={78} target={130} />)
    const bar = screen.getByRole('progressbar', { name: 'Proteína' })
    expect(bar).toHaveAttribute('aria-valuenow', '78')
    expect(bar).toHaveAttribute('aria-valuetext', '78 de 130 g')
  })

  it('caps the bar at the target but shows the real amount', () => {
    render(<MacroBar macro="fat" value={82} target={70} />)
    const bar = screen.getByRole('progressbar', { name: 'Grasas' })
    expect(bar).toHaveAttribute('aria-valuenow', '70')
    expect(bar).toHaveAttribute('aria-valuetext', '82 de 70 g')
  })
})
