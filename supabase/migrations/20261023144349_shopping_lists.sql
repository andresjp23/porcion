-- S-4: shopping lists for the supermarket mode (HU-11, HU-12). A scan session
-- without a list creates an active list named "Escaneo dd/mm", so both modes
-- share these tables. No health data here, so no consent check (like favorites).

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'Compras' check (char_length(btrim(name)) between 1 and 60),
  status public.list_status not null default 'active',
  created_at timestamptz not null default now()
);

-- HU-11 CA3: one active list per user; the others are history.
create unique index shopping_lists_one_active on public.shopping_lists (user_id) where status = 'active';
create index shopping_lists_user_id on public.shopping_lists (user_id, created_at desc);

alter table public.shopping_lists enable row level security;

revoke all on public.shopping_lists from anon;

create policy "shopping_lists: read own"
  on public.shopping_lists for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "shopping_lists: insert own"
  on public.shopping_lists for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "shopping_lists: update own"
  on public.shopping_lists for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "shopping_lists: delete own"
  on public.shopping_lists for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Items: free text ("leche"), a food of the base, or a scanned barcode. A
-- barcode without a food is "pendiente" and shows up in Por completar (HU-12 CA5).
create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 120),
  food_id uuid references public.foods (id) on delete set null,
  barcode text check (public.is_valid_gtin(barcode)),
  quantity int not null default 1 check (quantity between 1 and 999),
  source text not null default 'manual' check (source in ('manual', 'scan')),
  checked_at timestamptz,
  created_at timestamptz not null default now()
);

-- HU-12 CA6: a code scanned twice in a list is one item with a higher quantity.
create unique index shopping_list_items_one_per_barcode
  on public.shopping_list_items (list_id, barcode) where barcode is not null;
create index shopping_list_items_list_id on public.shopping_list_items (list_id, created_at);
create index shopping_list_items_pending on public.shopping_list_items (barcode) where food_id is null;
create index shopping_list_items_food_id on public.shopping_list_items (food_id);

alter table public.shopping_list_items enable row level security;

revoke all on public.shopping_list_items from anon;

create policy "shopping_list_items: read own"
  on public.shopping_list_items for select
  to authenticated
  using (exists (
    select 1 from public.shopping_lists l
    where l.id = list_id and l.user_id = (select auth.uid())
  ));

create policy "shopping_list_items: insert own"
  on public.shopping_list_items for insert
  to authenticated
  with check (exists (
    select 1 from public.shopping_lists l
    where l.id = list_id and l.user_id = (select auth.uid())
  ));

create policy "shopping_list_items: update own"
  on public.shopping_list_items for update
  to authenticated
  using (exists (
    select 1 from public.shopping_lists l
    where l.id = list_id and l.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.shopping_lists l
    where l.id = list_id and l.user_id = (select auth.uid())
  ));

create policy "shopping_list_items: delete own"
  on public.shopping_list_items for delete
  to authenticated
  using (exists (
    select 1 from public.shopping_lists l
    where l.id = list_id and l.user_id = (select auth.uid())
  ));

-- A scanned item whose code is already in the base gets its food right away,
-- even if the food was created between the lookup and the insert.
create function public.shopping_list_items_link_food()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.barcode is not null and new.food_id is null then
    select f.id into new.food_id from public.foods f where f.barcode = new.barcode;
  end if;
  return new;
end;
$$;

create trigger shopping_list_items_link_food
  before insert or update of barcode on public.shopping_list_items
  for each row execute function public.shopping_list_items_link_food();

-- When anyone creates (or imports) a food with a code, every pending item with
-- that code is linked to it, so it leaves Por completar for all users.
-- Security definer: those items belong to other users.
create function public.foods_link_pending_items()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.shopping_list_items
  set food_id = new.id
  where barcode = new.barcode and food_id is null;
  return null;
end;
$$;

create trigger foods_link_pending_items
  after insert or update of barcode on public.foods
  for each row
  when (new.barcode is not null)
  execute function public.foods_link_pending_items();
