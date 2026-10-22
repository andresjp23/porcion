import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Segmented } from './Segmented'

const options = [
  { value: 'recent', label: 'Recientes' },
  { value: 'favorites', label: 'Favoritos' },
] as const

describe('Segmented', () => {
  it('is a named group whose options report and change the selection', async () => {
    const onChange = vi.fn()
    render(<Segmented label="Lista" options={options} value="recent" onChange={onChange} />)
    expect(screen.getByRole('group', { name: 'Lista' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recientes' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Favoritos' }))
    expect(onChange).toHaveBeenCalledWith('favorites')
  })
})
