-- S-6: one scan of the supermarket mode into a shopping list (HU-12), in a
-- single atomic step so two quick scans of the same code cannot race:
--   1. the code is already in the list → its quantity goes up (CA6);
--   2. the app matched an item of the list (`claim_item_id`, CA2) → that item
--      takes the code and the food, and is checked;
--   3. otherwise → a new checked item.
-- Security invoker: the shopping_list_items policies keep it to own lists.
-- Returns {"item_id": uuid, "outcome": "repeat" | "claimed" | "added"}.

create function public.scan_into_list(
  list_id uuid,
  barcode text,
  label text,
  food_id uuid default null,
  claim_item_id uuid default null
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
-- Parameters share names with columns; every parameter is written qualified.
#variable_conflict use_column
declare
  target uuid;
begin
  update public.shopping_list_items i
  set quantity = i.quantity + 1, checked_at = coalesce(i.checked_at, now())
  where i.list_id = scan_into_list.list_id and i.barcode = scan_into_list.barcode
  returning i.id into target;
  if found then
    return jsonb_build_object('item_id', target, 'outcome', 'repeat');
  end if;

  if scan_into_list.claim_item_id is not null then
    update public.shopping_list_items i
    set
      barcode = scan_into_list.barcode,
      food_id = coalesce(scan_into_list.food_id, i.food_id),
      checked_at = coalesce(i.checked_at, now())
    where i.id = scan_into_list.claim_item_id
      and i.list_id = scan_into_list.list_id
      and i.barcode is null
    returning i.id into target;
    if found then
      return jsonb_build_object('item_id', target, 'outcome', 'claimed');
    end if;
  end if;

  insert into public.shopping_list_items (list_id, label, barcode, food_id, source, checked_at)
  values (
    scan_into_list.list_id,
    btrim(scan_into_list.label),
    scan_into_list.barcode,
    scan_into_list.food_id,
    'scan',
    now()
  )
  -- A scan of the same code that got in between counts as a repeat.
  on conflict (list_id, barcode) where barcode is not null
  do update set quantity = public.shopping_list_items.quantity + 1
  returning id into target;

  return jsonb_build_object('item_id', target, 'outcome', 'added');
end;
$$;

revoke execute on function public.scan_into_list(uuid, text, text, uuid, uuid) from public, anon;
grant execute on function public.scan_into_list(uuid, text, text, uuid, uuid) to authenticated;
