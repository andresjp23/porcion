import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import {
  supabase as mock,
  queueQueryResult,
  setRpcDefault,
  setTableDefault,
} from '@/test/supabaseMock'
import { ShoppingPage } from './ShoppingPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

const LIST_ID = 'e0000000-0000-4000-8000-000000000001'

function item(overrides: Record<string, unknown> = {}) {
  return {
    id: 'i1',
    label: 'leche',
    food_id: null,
    barcode: null,
    quantity: 1,
    source: 'manual',
    checked_at: null,
    created_at: '2026-10-23T12:00:00Z',
    food: null,
    ...overrides,
  }
}

function list(items: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    id: LIST_ID,
    name: 'Compras',
    created_at: '2026-10-23T11:00:00Z',
    shopping_list_items: items,
    ...overrides,
  }
}

/**
 * Both queries read shopping_lists. The history (a child) fetches first, then
 * the active list; later refetches are of the active list after a change.
 */
function setLists({ active, history = [] }: { active: unknown; history?: unknown[] }) {
  queueQueryResult('shopping_lists', { data: history, error: null })
  setTableDefault('shopping_lists', { data: active, error: null })
}

function renderPage() {
  return renderWithAuth([{ path: '/shopping', element: <ShoppingPage /> }], {
    path: '/shopping',
    session: signedInSession,
  })
}

const callsTo = (spy: keyof typeof mock.query) => vi.mocked(mock.query[spy]).mock.calls

describe('ShoppingPage', () => {
  beforeEach(() => {
    resetSupabaseMock()
    setRpcDefault('search_foods', { data: [], error: null })
  })

  it('offers to create a list when there is none', async () => {
    setLists({ active: null })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Crear lista' }))
    expect(vi.mocked(mock.from)).toHaveBeenCalledWith('shopping_lists')
    expect(callsTo('insert')).toContainEqual([{ name: 'Compras' }])
  })

  it('shows the items and how many are checked', async () => {
    setLists({
      active: list([
        item(),
        item({ id: 'i2', label: 'avena', quantity: 2, checked_at: '2026-10-23T12:10:00Z' }),
      ]),
    })
    renderPage()
    expect(await screen.findByText('1 de 2 marcados')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'leche' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'avena × 2' })).toBeChecked()
  })

  it('adds a free-text item right away (HU-11 CA1)', async () => {
    setLists({ active: list([]) })
    renderPage()
    expect(await screen.findByText(/Tu lista está vacía/)).toBeInTheDocument()

    setTableDefault('shopping_lists', {
      data: list([item({ id: 'i9', label: 'pan amasado' })]),
      error: null,
    })
    await userEvent.type(screen.getByLabelText('Agregar a la lista'), '  pan amasado ')
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(screen.getByRole('checkbox', { name: 'pan amasado' })).toBeInTheDocument()
    expect(screen.getByLabelText('Agregar a la lista')).toHaveValue('')
    expect(callsTo('insert')).toContainEqual([
      expect.objectContaining({ list_id: LIST_ID, label: 'pan amasado', food_id: null }),
    ])
  })

  it('asks for a label before adding', async () => {
    setLists({ active: list([]) })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar' }))
    expect(screen.getByText('Escribe qué necesitas')).toBeInTheDocument()
    expect(callsTo('insert')).toEqual([])
  })

  it('suggests foods of the base and adds them linked (HU-11 CA1)', async () => {
    setLists({ active: list([]) })
    setRpcDefault('search_foods', {
      data: [
        {
          id: 'food-1',
          name: 'Avena en hojuelas',
          brand: 'Quaker',
          basis: 'g',
          kcal_100: 370,
          protein_100: 13,
          carbs_100: 60,
          fat_100: 7,
          source: 'seed',
          verified: true,
          open_reports: 0,
          default_portion_id: null,
          default_portion_name: null,
          default_portion_grams: null,
        },
      ],
      error: null,
    })
    renderPage()
    await userEvent.type(await screen.findByLabelText('Agregar a la lista'), 'avena')
    await userEvent.click(
      await screen.findByRole('button', { name: 'Agregar Avena en hojuelas · Quaker' }),
    )
    expect(callsTo('insert')).toContainEqual([
      expect.objectContaining({ label: 'Avena en hojuelas · Quaker', food_id: 'food-1' }),
    ])
  })

  it('marks and unmarks items (HU-11 CA2)', async () => {
    setLists({ active: list([item()]) })
    renderPage()
    const box = await screen.findByRole('checkbox', { name: 'leche' })
    setTableDefault('shopping_lists', {
      data: list([item({ checked_at: '2026-10-23T12:30:00Z' })]),
      error: null,
    })
    await userEvent.click(box)
    expect(box).toBeChecked()
    expect(screen.getByText('1 de 1 marcado')).toBeInTheDocument()
    expect(callsTo('update')).toContainEqual([{ checked_at: expect.any(String) }])

    setTableDefault('shopping_lists', { data: list([item()]), error: null })
    await userEvent.click(box)
    expect(box).not.toBeChecked()
    expect(callsTo('update')).toContainEqual([{ checked_at: null }])
  })

  it('removes an item', async () => {
    setLists({ active: list([item()]) })
    renderPage()
    const remove = await screen.findByRole('button', { name: 'Quitar leche' })
    setTableDefault('shopping_lists', { data: list([]), error: null })
    await userEvent.click(remove)
    expect(screen.queryByRole('checkbox', { name: 'leche' })).not.toBeInTheDocument()
    expect(callsTo('delete')).toHaveLength(1)
  })

  it('finishes the list into the history after confirming (HU-11 CA3)', async () => {
    setLists({
      active: list([item()]),
      history: [
        list([item({ checked_at: '2026-10-20T12:00:00Z' })], {
          id: 'old',
          name: 'Escaneo 20/10',
          created_at: '2026-10-20T15:00:00Z',
        }),
      ],
    })
    renderPage()
    const history = await screen.findByRole('region', { name: 'Listas anteriores' })
    expect(within(history).getByText('Escaneo 20/10')).toBeInTheDocument()
    expect(within(history).getByText('Mar 20 oct')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Terminar lista' }))
    const sheet = screen.getByRole('dialog', { name: '¿Terminar esta lista?' })
    expect(within(sheet).getByText(/Queda 1 sin marcar/)).toBeInTheDocument()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Terminar lista' }))
    expect(callsTo('update')).toContainEqual([{ status: 'archived' }])
  })
})
