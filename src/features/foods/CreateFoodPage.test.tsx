import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import { supabase as mock, queueQueryResult, queueRpcResult } from '@/test/supabaseMock'
import { CreateFoodPage } from './CreateFoodPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

const NEW_ID = '0c7b6f2e-1a2b-4c3d-8e9f-0a1b2c3d4e5f'
const EXISTING_ID = '9f8e7d6c-5b4a-4c3d-8e9f-0a1b2c3d4e5f'

function DetailStub() {
  const location = useLocation()
  return <p>Detalle {location.pathname + location.search}</p>
}

function renderPage(path = '/foods/new?meal=lunch') {
  return renderWithAuth(
    [
      { path: '/foods/new', element: <CreateFoodPage /> },
      { path: '/foods/:id', element: <DetailStub /> },
    ],
    { path, session: signedInSession },
  )
}

async function fillTuna() {
  await userEvent.type(screen.getByLabelText('Nombre'), 'Atún en agua')
  await userEvent.type(screen.getByLabelText('Energía (kcal)'), '116')
  await userEvent.type(screen.getByLabelText('Proteína (g)'), '26')
  await userEvent.type(screen.getByLabelText('Carbohidratos (g)'), '0')
  await userEvent.type(screen.getByLabelText('Grasas (g)'), '1,2')
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Guardar alimento' }))
const createCalls = () => vi.mocked(mock.rpc).mock.calls.filter(([fn]) => fn === 'create_food')

describe('CreateFoodPage', () => {
  beforeEach(() => {
    resetSupabaseMock()
  })

  it('saves a community food and opens it, keeping the meal (HU-09 CA1, CA4)', async () => {
    queueRpcResult('create_food', { data: NEW_ID, error: null })
    renderPage()
    await fillTuna()
    await userEvent.type(screen.getByLabelText('Marca'), 'San José')
    await save()

    expect(await screen.findByText(`Detalle /foods/${NEW_ID}?meal=lunch`)).toBeInTheDocument()
    expect(createCalls()).toEqual([
      [
        'create_food',
        {
          name: 'Atún en agua',
          brand: 'San José',
          basis: 'g',
          kcal_100: 116,
          protein_100: 26,
          carbs_100: 0,
          fat_100: 1.2,
          barcode: undefined,
          portions: [],
        },
      ],
    ])
  })

  it('keeps the day when opening the new food', async () => {
    queueRpcResult('create_food', { data: NEW_ID, error: null })
    renderPage('/foods/new?meal=dinner&date=2026-10-21')
    await fillTuna()
    await save()
    expect(
      await screen.findByText(`Detalle /foods/${NEW_ID}?meal=dinner&date=2026-10-21`),
    ).toBeInTheDocument()
  })

  it('shows the 4/4/9 check while typing (R-07)', async () => {
    renderPage()
    await fillTuna()
    expect(screen.getByText('Según los macros serían ≈ 115 kcal. Coincide.')).toBeInTheDocument()
  })

  it('asks for confirmation when the label does not add up (HU-09 CA3)', async () => {
    queueRpcResult('create_food', { data: NEW_ID, error: null })
    renderPage()
    await fillTuna()
    await userEvent.clear(screen.getByLabelText('Energía (kcal)'))
    await userEvent.type(screen.getByLabelText('Energía (kcal)'), '300')
    expect(screen.getByText(/Revisa que copiaste bien la etiqueta/)).toBeInTheDocument()

    await save()
    expect(
      await screen.findByText('Confirma que copiaste bien los valores de la etiqueta'),
    ).toBeInTheDocument()
    expect(createCalls()).toHaveLength(0)

    await userEvent.click(screen.getByLabelText('Los valores son los de la etiqueta'))
    await save()
    expect(await screen.findByText(`Detalle /foods/${NEW_ID}?meal=lunch`)).toBeInTheDocument()
  })

  it('explains values out of range without saving', async () => {
    renderPage()
    await fillTuna()
    await userEvent.clear(screen.getByLabelText('Energía (kcal)'))
    await userEvent.type(screen.getByLabelText('Energía (kcal)'), '950')
    await save()
    expect(
      await screen.findByText('Por 100 g, la energía no puede pasar de 900 kcal'),
    ).toBeInTheDocument()
    expect(createCalls()).toHaveLength(0)
  })

  it('adds and removes portions; the first is the default (HU-09 CA2)', async () => {
    queueRpcResult('create_food', { data: NEW_ID, error: null })
    renderPage()
    await fillTuna()
    const addPortion = screen.getByRole('button', { name: /Agregar porción/ })
    await userEvent.click(addPortion)
    await userEvent.click(addPortion)
    await userEvent.type(screen.getByLabelText('Porción 1'), '1 lata')
    await userEvent.type(screen.getAllByLabelText('Gramos (g)')[0]!, '120')
    await userEvent.click(screen.getByRole('button', { name: 'Quitar porción 2' }))
    expect(screen.getByText(/La primera porción es la que se usa/)).toBeInTheDocument()

    await save()
    await screen.findByText(/Detalle/)
    expect(createCalls()[0]?.[1]).toMatchObject({ portions: [{ name: '1 lata', grams: 120 }] })
  })

  it('prefills the name from a search and the barcode from the scanner', async () => {
    queueRpcResult('create_food', { data: NEW_ID, error: null })
    // UPC-A as scanned; stored as its EAN-13.
    renderPage('/foods/new?name=atun%20lomitos&barcode=036000291452')
    expect(screen.getByLabelText('Nombre')).toHaveValue('atun lomitos')
    expect(screen.getByText('Código 0036000291452')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Energía (kcal)'), '116')
    await userEvent.type(screen.getByLabelText('Proteína (g)'), '26')
    await userEvent.type(screen.getByLabelText('Carbohidratos (g)'), '0')
    await userEvent.type(screen.getByLabelText('Grasas (g)'), '1,2')
    await save()
    await screen.findByText(/Detalle/)
    expect(createCalls()[0]?.[1]).toMatchObject({ barcode: '0036000291452' })
  })

  it('prefills the brand of an incomplete Open Food Facts product', () => {
    renderPage('/foods/new?barcode=7801234567894&name=Leche%20entera&brand=Soprole')
    expect(screen.getByLabelText('Nombre')).toHaveValue('Leche entera')
    expect(screen.getByLabelText('Marca')).toHaveValue('Soprole')
  })

  it('ignores a barcode with a wrong check digit', () => {
    renderPage('/foods/new?barcode=7801234567890')
    expect(screen.queryByText(/^Código/)).not.toBeInTheDocument()
  })

  it('offers the existing food when the barcode is taken (HU-09 CA5)', async () => {
    queueRpcResult('create_food', { data: null, error: { code: '23505', message: 'duplicate' } })
    queueQueryResult('foods', { data: { id: EXISTING_ID }, error: null })
    renderPage('/foods/new?barcode=7801234567894')
    await fillTuna()
    await save()

    expect(
      await screen.findByText('Ya existe un alimento con este código de barras.'),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Abrir ese alimento' }))
    expect(screen.getByText(`Detalle /foods/${EXISTING_ID}`)).toBeInTheDocument()
  })

  it('says so when saving fails', async () => {
    queueRpcResult('create_food', { data: null, error: { code: '08006', message: 'offline' } })
    renderPage()
    await fillTuna()
    await save()
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar el alimento')
  })
})
