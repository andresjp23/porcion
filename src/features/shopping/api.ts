import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

export type ShoppingItem = {
  id: string
  label: string
  foodId: string | null
  barcode: string | null
  quantity: number
  source: 'manual' | 'scan'
  checkedAt: string | null
  createdAt: string
  /** The linked food, for its kcal; null while a scanned code is pending (HU-12 CA4). */
  food: { name: string; brand: string | null; basis: 'g' | 'ml'; kcal100: number } | null
}

export type ShoppingList = {
  id: string
  name: string
  createdAt: string
  /** In the order they were added. */
  items: ShoppingItem[]
}

const itemSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    food_id: z.string().nullable(),
    barcode: z.string().nullable(),
    quantity: z.number(),
    source: z.enum(['manual', 'scan']),
    checked_at: z.string().nullable(),
    created_at: z.string(),
    food: z
      .object({
        name: z.string(),
        brand: z.string().nullable(),
        basis: z.enum(['g', 'ml']),
        kcal_100: z.number(),
      })
      .nullable(),
  })
  .transform((row): ShoppingItem => ({
    id: row.id,
    label: row.label,
    foodId: row.food_id,
    barcode: row.barcode,
    quantity: row.quantity,
    source: row.source,
    checkedAt: row.checked_at,
    createdAt: row.created_at,
    food: row.food && {
      name: row.food.name,
      brand: row.food.brand,
      basis: row.food.basis,
      kcal100: row.food.kcal_100,
    },
  }))

const listSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    created_at: z.string(),
    shopping_list_items: z.array(itemSchema),
  })
  .transform((row): ShoppingList => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    items: row.shopping_list_items.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  }))

// Explicit food columns: created_by is not readable (R-11, B-7).
const LIST_COLUMNS =
  'id, name, created_at, shopping_list_items (id, label, food_id, barcode, quantity, source, checked_at, created_at, food:foods (name, brand, basis, kcal_100))'

export const shoppingKeys = {
  active: ['shopping', 'active'] as const,
  history: ['shopping', 'history'] as const,
}

/** HU-11: the user's active list, or null when there is none (CA3: one at a time). */
export function useActiveList() {
  return useQuery({
    queryKey: shoppingKeys.active,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select(LIST_COLUMNS)
        .eq('status', 'active')
        .abortSignal(signal)
        .maybeSingle()
      if (error) throw error
      return data === null ? null : listSchema.parse(data)
    },
  })
}

/** HU-11 CA3: finished lists, newest first. */
export function useListHistory() {
  return useQuery({
    queryKey: shoppingKeys.history,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select(LIST_COLUMNS)
        .eq('status', 'archived')
        .order('created_at', { ascending: false })
        .limit(20)
        .abortSignal(signal)
      if (error) throw error
      return z.array(listSchema).parse(data)
    },
  })
}

const UNIQUE_VIOLATION = '23505'

/**
 * Starts a list and returns its id. If another tab already made one, that one
 * is the active list and its id comes back instead.
 */
export async function createList(name: string) {
  const created = await supabase.from('shopping_lists').insert({ name }).select('id').single()
  if (!created.error) return z.string().parse(created.data.id)
  if (created.error.code !== UNIQUE_VIOLATION) throw created.error
  const active = await supabase.from('shopping_lists').select('id').eq('status', 'active').single()
  if (active.error) throw active.error
  return z.string().parse(active.data.id)
}

export function useCreateList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createList,
    onSettled: () => queryClient.invalidateQueries({ queryKey: shoppingKeys.active }),
  })
}

const scanResultSchema = z.object({
  item_id: z.string(),
  outcome: z.enum(['repeat', 'claimed', 'added']),
})

export type ScanIntoList = {
  listId: string
  barcode: string
  /** For a new item: the food's name, or the code when the product is unknown. */
  label: string
  foodId: string | null
  /** The item matchScan picked (HU-12 CA2). */
  claimItemId: string | null
}

/** HU-12: one scan of the supermarket mode into the list (RPC scan_into_list). */
export async function scanIntoList(scan: ScanIntoList) {
  const { data, error } = await supabase.rpc('scan_into_list', {
    list_id: scan.listId,
    barcode: scan.barcode,
    label: scan.label,
    food_id: scan.foodId ?? undefined,
    claim_item_id: scan.claimItemId ?? undefined,
  })
  if (error) throw error
  const result = scanResultSchema.parse(data)
  return { itemId: result.item_id, outcome: result.outcome }
}

/** Moves the active list to the history (HU-11 CA3). */
export function useFinishList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from('shopping_lists')
        .update({ status: 'archived' })
        .eq('id', listId)
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['shopping'] }),
  })
}

/** Applies a change to the cached active list right away and returns how to undo it. */
async function patchItems(
  queryClient: QueryClient,
  change: (items: ShoppingItem[]) => ShoppingItem[],
) {
  await queryClient.cancelQueries({ queryKey: shoppingKeys.active })
  const previous = queryClient.getQueryData<ShoppingList | null>(shoppingKeys.active)
  if (previous) {
    queryClient.setQueryData<ShoppingList>(shoppingKeys.active, {
      ...previous,
      items: change(previous.items),
    })
  }
  return () => queryClient.setQueryData(shoppingKeys.active, previous)
}

type Rollback = { rollback: () => void }

export type NewItem = { id: string; label: string; foodId: string | null }

/** HU-11 CA1: free text or a food of the base. Callers pass `id: crypto.randomUUID()`. */
export function useAddItem(listId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (item: NewItem) => {
      const { error } = await supabase.from('shopping_list_items').insert({
        id: item.id,
        list_id: listId,
        label: item.label,
        food_id: item.foodId,
        source: 'manual',
      })
      if (error) throw error
    },
    onMutate: async (item): Promise<Rollback> => {
      const entry: ShoppingItem = {
        ...item,
        barcode: null,
        quantity: 1,
        source: 'manual',
        checkedAt: null,
        createdAt: new Date().toISOString(),
        food: null,
      }
      return { rollback: await patchItems(queryClient, (items) => [...items, entry]) }
    },
    onError: (_error, _item, context) => context?.rollback(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: shoppingKeys.active }),
  })
}

/** HU-11 CA2: marks or unmarks an item. */
export function useToggleItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({ checked_at: checked ? new Date().toISOString() : null })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, checked }): Promise<Rollback> => {
      const checkedAt = checked ? new Date().toISOString() : null
      return {
        rollback: await patchItems(queryClient, (items) =>
          items.map((item) => (item.id === id ? { ...item, checkedAt } : item)),
        ),
      }
    },
    onError: (_error, _vars, context) => context?.rollback(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: shoppingKeys.active }),
  })
}

export function useRemoveItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shopping_list_items').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id): Promise<Rollback> => ({
      rollback: await patchItems(queryClient, (items) => items.filter((item) => item.id !== id)),
    }),
    onError: (_error, _id, context) => context?.rollback(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: shoppingKeys.active }),
  })
}
