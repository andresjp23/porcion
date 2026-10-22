-- B-1: the shared food base (foods, food_portions) and per-user favorites.
-- The author edit window on foods and hiding created_by come in B-7.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- unaccent() is only stable because its dictionary could change, so it cannot
-- feed a generated column. Pinning the dictionary makes this wrapper safe to
-- declare immutable.
create function public.unaccent_immutable(value text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, value);
$$;

-- What search_foods matches against: name, brand and aliases, lower case and
-- without accents. array_to_string() is stable, hence the immutable wrapper.
create function public.food_search_text(name text, brand text, aliases text[])
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select public.unaccent_immutable(
    lower(name || ' ' || coalesce(brand, '') || ' ' || array_to_string(aliases, ' '))
  );
$$;

-- Canonical barcode (src/domain/barcode.ts): 8 or 13 digits with a valid GS1
-- check digit. UPC-A and UPC-E are stored as their EAN-13.
create function public.is_valid_gtin(code text)
returns boolean
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select code ~ '^([0-9]{8}|[0-9]{13})$'
    and (
      10 - (
        select sum(substr(code, length(code) - i, 1)::int * case when i % 2 = 1 then 3 else 1 end)
        from generate_series(1, length(code) - 1) as i
      ) % 10
    ) % 10 = right(code, 1)::int;
$$;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- foods: nutrients always per 100 g or 100 ml (R-01).
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  brand text check (char_length(brand) <= 80),
  aliases text[] not null default '{}',
  search_text text not null generated always as (public.food_search_text(name, brand, aliases)) stored,
  basis public.food_basis not null default 'g',
  kcal_100 numeric(6, 2) not null check (kcal_100 between 0 and 900),
  protein_100 numeric(6, 2) not null check (protein_100 between 0 and 100),
  carbs_100 numeric(6, 2) not null check (carbs_100 between 0 and 100),
  fat_100 numeric(6, 2) not null check (fat_100 between 0 and 100),
  barcode text unique check (public.is_valid_gtin(barcode)),
  source public.food_source not null,
  verified boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  open_reports int not null default 0 check (open_reports >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint foods_macros_within_100 check (protein_100 + carbs_100 + fat_100 <= 100)
);

comment on column public.foods.created_by is 'Author of a community food (R-11). Not readable by other users (B-7).';
comment on column public.foods.open_reports is 'Kept by a trigger on food_reports (B-8).';

create index foods_search_text_trgm on public.foods using gin (search_text extensions.gin_trgm_ops);

create trigger foods_set_updated_at
  before update on public.foods
  for each row execute function public.set_updated_at();

alter table public.foods enable row level security;

-- Seed and Open Food Facts rows are written by the maintainer or by
-- import_off_product (S-2). Nobody deletes foods from the client.
revoke all on public.foods from anon;
revoke delete on public.foods from authenticated;

create policy "foods: read all"
  on public.foods for select
  to authenticated
  using (true);

create policy "foods: insert own community food"
  on public.foods for insert
  to authenticated
  with check (
    source = 'user'
    and created_by = (select auth.uid())
    and not verified
    and open_reports = 0
  );

-- R-11: the author may change a food only during its first 24 h. B-7 adds the
-- "nobody else logged it" condition once food_logs exists. Security definer so
-- it keeps reading created_by after B-7 hides that column.
create function public.can_edit_food(target_food_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.foods f
    where f.id = target_food_id
      and f.created_by = (select auth.uid())
      and f.created_at > now() - interval '24 hours'
  );
$$;

revoke execute on function public.can_edit_food(uuid) from public, anon;

-- food_portions: named equivalences in grams ("1 unidad" = 120 g).
create table public.food_portions (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  grams numeric(7, 2) not null check (grams > 0),
  is_default boolean not null default false
);

create index food_portions_food_id on public.food_portions (food_id);
create unique index food_portions_one_default on public.food_portions (food_id) where is_default;

alter table public.food_portions enable row level security;

revoke all on public.food_portions from anon;

create policy "food_portions: read all"
  on public.food_portions for select
  to authenticated
  using (true);

create policy "food_portions: insert while editable"
  on public.food_portions for insert
  to authenticated
  with check ((select public.can_edit_food(food_id)));

create policy "food_portions: update while editable"
  on public.food_portions for update
  to authenticated
  using ((select public.can_edit_food(food_id)))
  with check ((select public.can_edit_food(food_id)));

create policy "food_portions: delete while editable"
  on public.food_portions for delete
  to authenticated
  using ((select public.can_edit_food(food_id)));

-- favorites: per user, no health data so no consent check.
create table public.favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, food_id)
);

create index favorites_food_id on public.favorites (food_id);

alter table public.favorites enable row level security;

revoke all on public.favorites from anon;
revoke update on public.favorites from authenticated;

create policy "favorites: read own"
  on public.favorites for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "favorites: insert own"
  on public.favorites for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "favorites: delete own"
  on public.favorites for delete
  to authenticated
  using (user_id = (select auth.uid()));
