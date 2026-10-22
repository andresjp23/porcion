import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FoodRow } from './FoodRow'

describe('FoodRow', () => {
  it('opens the food and adds it with separate buttons', async () => {
    const onSelect = vi.fn()
    const onAdd = vi.fn()
    render(
      <FoodRow
        name="Huevo"
        portion="1 unidad · 50 g"
        kcal={70.4}
        onSelect={onSelect}
        onAdd={onAdd}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Agregar Huevo' }))
    expect(onAdd).toHaveBeenCalledOnce()
    expect(onSelect).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: /Huevo.*70 kcal/ }))
    expect(onSelect).toHaveBeenCalledOnce()
  })
})
