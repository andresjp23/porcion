import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import {
  supabase as mock,
  queueRpcResult,
  setRpcDefault,
  setTableDefault,
} from '@/test/supabaseMock'
import { EditFoodPage } from './EditFoodPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

const FOOD_ID = '4b0a8c2e-1f3d-4e5a-9b6c-7d8e9f0a1b2c'

const kuchen = {
  id: FOOD_ID,
  name: 'Kuchen',
  brand: 'Casero',
  basis: 'g',
  kcal_100: 223.33,
  protein_100: 4.5,
  carbs_100: 30,
  fat_100: 10.25,
  source: 'user',
  verified: false,
  open_reports: 0,
  barcode: '7801234567894',
  food_portions: [
    { id: 'slice', name: '1 trozo', grams: 80, is_default: true },
    { id: 'whole', name: '1 kuchen', grams: 800, is_default: false },
  ],
}

function DetailStub() {
  const location = useLocation()
  return <p>Detalle {location.pathname + location.search}</p>
}

function renderEdit(canEdit = true) {
  setTableDefault('foods', { data: kuchen, error: null })
  setRpcDefault('can_edit_food', { data: canEdit, error: null })
  return renderWithAuth(
    [
      { path: '/foods/:id/edit', element: <EditFoodPage /> },
      { path: '/foods/:id', element: <DetailStub /> },
    ],
    { path: `/foods/${FOOD_ID}/edit?meal=snack`, session: signedInSession },
  )
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Guardar alimento' }))
const updateCalls = () => vi.mocked(mock.rpc).mock.calls.filter(([fn]) => fn === 'update_food')

describe('EditFoodPage', () => {
  beforeEach(() => {
    resetSupabaseMock()
  })

  it('starts from the current values, without rounding them', async () => {
    renderEdit()
    expect(await screen.findByLabelText('Nombre')).toHaveValue('Kuchen')
    expect(screen.getByLabelText('Marca')).toHaveValue('Casero')
    expect(screen.getByLabelText('Energía (kcal)')).toHaveValue('223,33')
    expect(screen.getByLabelText('Grasas (g)')).toHaveValue('10,25')
    expect(screen.getByLabelText('Porción 1')).toHaveValue('1 trozo')
    expect(screen.getByText('Código 7801234567894')).toBeInTheDocument()
  })

  it('saves the changes, keeping the ids of the portions that stay (B-7b)', async () => {
    queueRpcResult('update_food', { data: null, error: null })
    renderEdit()
    const name = await screen.findByLabelText('Nombre')
    await userEvent.clear(name)
    await userEvent.type(name, 'Kuchen de manzana')
    await userEvent.click(screen.getByRole('button', { name: 'Quitar porción 2' }))
    await userEvent.click(screen.getByRole('button', { name: /Agregar porción/ }))
    await userEvent.type(screen.getByLabelText('Porción 2'), '1 trozo chico')
    await userEvent.type(screen.getAllByLabelText('Gramos (g)')[1]!, '60')
    await save()

    expect(await screen.findByText(`Detalle /foods/${FOOD_ID}?meal=snack`)).toBeInTheDocument()
    expect(updateCalls()).toEqual([
      [
        'update_food',
        {
          food_id: FOOD_ID,
          name: 'Kuchen de manzana',
          brand: 'Casero',
          basis: 'g',
          kcal_100: 223.33,
          protein_100: 4.5,
          carbs_100: 30,
          fat_100: 10.25,
          portions: [
            { id: 'slice', name: '1 trozo', grams: 80 },
            { name: '1 trozo chico', grams: 60 },
          ],
        },
      ],
    ])
  })

  it('explains when the window closed before saving (R-11)', async () => {
    queueRpcResult('update_food', { data: null, error: { code: '42501', message: 'denied' } })
    renderEdit()
    await screen.findByLabelText('Nombre')
    await save()
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya no puedes editar este alimento')
  })

  it('does not show the form once the food cannot be edited', async () => {
    renderEdit(false)
    expect(await screen.findByText('Ya no puedes editar este alimento')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver el alimento' })).toHaveAttribute(
      'href',
      `/foods/${FOOD_ID}?meal=snack`,
    )
  })
})
