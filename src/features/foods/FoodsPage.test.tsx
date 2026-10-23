import { screen } from '@testing-library/react'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import { setTableDefault } from '@/test/supabaseMock'
import { FoodsPage } from './FoodsPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

function renderPage() {
  return renderWithAuth([{ path: '/foods', element: <FoodsPage /> }], {
    path: '/foods',
    session: signedInSession,
  })
}

const item = (checked: boolean) => ({
  id: crypto.randomUUID(),
  label: 'leche',
  food_id: null,
  barcode: null,
  quantity: 1,
  source: 'manual',
  checked_at: checked ? '2026-10-23T12:00:00Z' : null,
  created_at: '2026-10-23T11:00:00Z',
  food: null,
})

describe('FoodsPage', () => {
  beforeEach(() => resetSupabaseMock())

  it('leads to the shopping list with its progress', async () => {
    setTableDefault('shopping_lists', {
      data: {
        id: 'list-1',
        name: 'Compras',
        created_at: '2026-10-23T10:00:00Z',
        shopping_list_items: [item(true), item(false), item(false)],
      },
      error: null,
    })
    renderPage()
    const link = await screen.findByRole('link', { name: /Lista de compras.*1 de 3 marcados/ })
    expect(link).toHaveAttribute('href', '/shopping')
    expect(screen.getByRole('link', { name: 'Alimentos' })).toHaveAttribute('aria-current', 'page')
  })

  it('invites to start a list when there is none', async () => {
    setTableDefault('shopping_lists', { data: null, error: null })
    renderPage()
    expect(
      await screen.findByRole('link', { name: /Anota lo que necesitas comprar/ }),
    ).toBeInTheDocument()
  })
})
